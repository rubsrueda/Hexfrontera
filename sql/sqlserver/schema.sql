-- ============================================================================
-- ESQUEMA EQUIVALENTE · SQL Server 2016+
-- ----------------------------------------------------------------------------
-- Referencia de migración. El juego actual usa PostgreSQL/Supabase; SQL Server
-- necesita además una API/SP que sustituya a PostgREST y a las RPC.
--
-- Tipos:
--   UUID        -> UNIQUEIDENTIFIER
--   TIMESTAMPTZ -> DATETIMEOFFSET(3)
--   BOOLEAN     -> BIT
--   TEXT        -> NVARCHAR(MAX)
--   JSONB       -> NVARCHAR(MAX) + ISJSON
--   NOW()       -> SYSDATETIMEOFFSET()
-- ============================================================================

IF OBJECT_ID(N'dbo.hf_campaigns', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.hf_campaigns (
        campaign_id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT DF_hf_campaigns_id DEFAULT NEWID()
            CONSTRAINT PK_hf_campaigns PRIMARY KEY,
        name         NVARCHAR(100) NOT NULL,
        description  NVARCHAR(MAX) NULL,
        start_date   DATETIMEOFFSET(3) NOT NULL,
        end_date     DATETIMEOFFSET(3) NOT NULL,
        is_active    BIT NOT NULL CONSTRAINT DF_hf_campaigns_active DEFAULT 1,
        created_at   DATETIMEOFFSET(3) NOT NULL
            CONSTRAINT DF_hf_campaigns_created DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT CK_hf_campaigns_name CHECK (LEN(LTRIM(RTRIM(name))) > 0),
        CONSTRAINT CK_hf_campaigns_window CHECK (end_date > start_date)
    );
END;
GO

IF OBJECT_ID(N'dbo.hf_event_types', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.hf_event_types (
        event_type   NVARCHAR(50) NOT NULL
            CONSTRAINT PK_hf_event_types PRIMARY KEY,
        label        NVARCHAR(120) NOT NULL,
        description  NVARCHAR(MAX) NULL,
        trigger_hint NVARCHAR(200) NULL,
        is_active    BIT NOT NULL CONSTRAINT DF_hf_event_types_active DEFAULT 1,
        sort_order   INT NOT NULL CONSTRAINT DF_hf_event_types_order DEFAULT 100,
        created_at   DATETIME2(3) NOT NULL
            CONSTRAINT DF_hf_event_types_created DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_hf_event_types_format
            CHECK (event_type LIKE N'[A-Z]%' AND event_type NOT LIKE N'%[^A-Z0-9_]%'),
        CONSTRAINT CK_hf_event_types_label CHECK (LEN(LTRIM(RTRIM(label))) > 0)
    );
END;
GO

MERGE dbo.hf_event_types AS dst
USING (VALUES
    (N'GAME_ENTRY', N'Entrada al juego',
     N'Ingreso al juego / carga inicial del Hub.',
     N'main.js · openHub() · una vez por sesión', 10),
    (N'MATCH_OVER', N'Fin de partida',
     N'Al terminar una partida y cerrar el resumen.',
     N'game.js · showEnd() · al cerrar con Menú', 20),
    (N'TRIBE_MODIFIED', N'Tribu modificada',
     N'Al terminar de modificar la tribu.',
     N'screens.js · al salir de Tribu con cambios', 30),
    (N'MAP_EDIT_COMPLETE', N'Mapa guardado',
     N'Al guardar un mapa en el editor.',
     N'editor.js · tras guardar el mapa', 40),
    (N'REPLAY_FINISHED', N'Repetición terminada',
     N'Al terminar de ver una repetición.',
     N'replay.js · finish() · al cerrar el resumen', 50)
) AS src(event_type, label, description, trigger_hint, sort_order)
ON dst.event_type = src.event_type
WHEN NOT MATCHED THEN
    INSERT (event_type, label, description, trigger_hint, sort_order)
    VALUES (src.event_type, src.label, src.description, src.trigger_hint, src.sort_order);
GO

IF OBJECT_ID(N'dbo.hf_campaign_events', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.hf_campaign_events (
        campaign_event_id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT DF_hf_campaign_events_id DEFAULT NEWID()
            CONSTRAINT PK_hf_campaign_events PRIMARY KEY,
        campaign_id       UNIQUEIDENTIFIER NOT NULL,
        event_type        NVARCHAR(50) NOT NULL,
        collect_user_info BIT NOT NULL CONSTRAINT DF_hf_campaign_events_info DEFAULT 1,
        allow_comments    BIT NOT NULL CONSTRAINT DF_hf_campaign_events_comments DEFAULT 1,
        is_active         BIT NOT NULL CONSTRAINT DF_hf_campaign_events_active DEFAULT 1,
        created_at        DATETIMEOFFSET(3) NOT NULL
            CONSTRAINT DF_hf_campaign_events_created DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_hf_campaign_events_campaign
            FOREIGN KEY (campaign_id) REFERENCES dbo.hf_campaigns(campaign_id)
            ON DELETE CASCADE,
        CONSTRAINT UQ_hf_campaign_events_event UNIQUE (campaign_id, event_type),
        CONSTRAINT CK_hf_campaign_events_type
            CHECK (event_type LIKE N'[A-Z]%' AND event_type NOT LIKE N'%[^A-Z0-9_]%'),
        CONSTRAINT FK_hf_campaign_events_type
            FOREIGN KEY (event_type) REFERENCES dbo.hf_event_types(event_type)
    );
END;
GO

-- Compatibilidad con una tabla hf_campaign_events ya existente.
IF OBJECT_ID(N'dbo.hf_campaign_events', N'U') IS NOT NULL
BEGIN
    INSERT INTO dbo.hf_event_types (event_type, label)
    SELECT DISTINCT ce.event_type, ce.event_type
    FROM dbo.hf_campaign_events ce
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.hf_event_types et WHERE et.event_type = ce.event_type
    );

    IF NOT EXISTS (
        SELECT 1 FROM sys.foreign_keys
        WHERE name = N'FK_hf_campaign_events_type'
    )
        ALTER TABLE dbo.hf_campaign_events
            ADD CONSTRAINT FK_hf_campaign_events_type
            FOREIGN KEY (event_type) REFERENCES dbo.hf_event_types(event_type);
END;
GO

IF OBJECT_ID(N'dbo.hf_event_questions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.hf_event_questions (
        question_id       UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT DF_hf_event_questions_id DEFAULT NEWID()
            CONSTRAINT PK_hf_event_questions PRIMARY KEY,
        campaign_event_id UNIQUEIDENTIFIER NOT NULL,
        question_text     NVARCHAR(MAX) NOT NULL,
        question_type     NVARCHAR(30) NOT NULL,
        options           NVARCHAR(MAX) NULL,
        display_order     INT NOT NULL CONSTRAINT DF_hf_event_questions_order DEFAULT 1,
        is_required       BIT NOT NULL CONSTRAINT DF_hf_event_questions_required DEFAULT 0,
        CONSTRAINT FK_hf_event_questions_event
            FOREIGN KEY (campaign_event_id) REFERENCES dbo.hf_campaign_events(campaign_event_id)
            ON DELETE CASCADE,
        CONSTRAINT CK_hf_event_questions_type
            CHECK (question_type IN (N'RATING', N'SELECT', N'BOOLEAN', N'TEXT')),
        CONSTRAINT CK_hf_event_questions_order CHECK (display_order >= 1),
        CONSTRAINT CK_hf_event_questions_options
            CHECK (options IS NULL OR ISJSON(options) = 1)
    );
END;
GO

IF OBJECT_ID(N'dbo.hf_player_responses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.hf_player_responses (
        response_id       UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT DF_hf_player_responses_id DEFAULT NEWID()
            CONSTRAINT PK_hf_player_responses PRIMARY KEY,
        campaign_event_id UNIQUEIDENTIFIER NOT NULL,
        player_email      NVARCHAR(255) NULL,
        player_alias      NVARCHAR(100) NULL,
        general_comment   NVARCHAR(MAX) NULL,
        created_at        DATETIMEOFFSET(3) NOT NULL
            CONSTRAINT DF_hf_player_responses_created DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_hf_player_responses_event
            FOREIGN KEY (campaign_event_id) REFERENCES dbo.hf_campaign_events(campaign_event_id),
        CONSTRAINT CK_hf_player_responses_comment
            CHECK (general_comment IS NULL OR LEN(general_comment) <= 4000)
    );
END;
GO

IF OBJECT_ID(N'dbo.hf_response_details', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.hf_response_details (
        detail_id       UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT DF_hf_response_details_id DEFAULT NEWID()
            CONSTRAINT PK_hf_response_details PRIMARY KEY,
        response_id     UNIQUEIDENTIFIER NOT NULL,
        question_id     UNIQUEIDENTIFIER NOT NULL,
        response_value  NVARCHAR(MAX) NOT NULL,
        CONSTRAINT FK_hf_response_details_response
            FOREIGN KEY (response_id) REFERENCES dbo.hf_player_responses(response_id)
            ON DELETE CASCADE,
        CONSTRAINT FK_hf_response_details_question
            FOREIGN KEY (question_id) REFERENCES dbo.hf_event_questions(question_id),
        CONSTRAINT UQ_hf_response_details_once UNIQUE (response_id, question_id),
        CONSTRAINT CK_hf_response_details_value CHECK (LEN(LTRIM(RTRIM(response_value))) > 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.hf_survey_translations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.hf_survey_translations (
        translation_key  NVARCHAR(160) NOT NULL,
        locale           NVARCHAR(10)  NOT NULL,
        translation_text NVARCHAR(MAX) NOT NULL,
        updated_at       DATETIME2(3)  NOT NULL
            CONSTRAINT DF_hf_survey_translations_updated DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_hf_survey_translations PRIMARY KEY (translation_key, locale),
        CONSTRAINT CK_hf_survey_translations_key CHECK (translation_key LIKE N'survey.%'),
        CONSTRAINT CK_hf_survey_translations_text CHECK (LEN(LTRIM(RTRIM(translation_text))) > 0)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_hf_campaigns_dates')
    CREATE INDEX IX_hf_campaigns_dates ON dbo.hf_campaigns (start_date, end_date);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_hf_campaign_events_type')
    CREATE INDEX IX_hf_campaign_events_type ON dbo.hf_campaign_events (event_type);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_hf_event_questions_order')
    CREATE INDEX IX_hf_event_questions_order ON dbo.hf_event_questions (campaign_event_id, display_order);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_hf_player_responses_date')
    CREATE INDEX IX_hf_player_responses_date ON dbo.hf_player_responses (created_at);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_hf_response_details_question')
    CREATE INDEX IX_hf_response_details_question ON dbo.hf_response_details (question_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_hf_survey_translations_locale')
    CREATE INDEX IX_hf_survey_translations_locale ON dbo.hf_survey_translations (locale, translation_key);
GO
