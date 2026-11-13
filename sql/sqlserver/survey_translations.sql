-- ============================================================================
-- SEED INICIAL · dbo.hf_survey_translations (SQL Server 2016+)
-- 13 idiomas × 12 claves = 156 filas.
-- Tabla + seed. Requiere una API/SP para servir el JSON al cliente.
-- A partir de aquí, la tabla es la fuente de verdad.
-- ============================================================================

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
    CREATE INDEX IX_hf_survey_translations_locale
        ON dbo.hf_survey_translations (locale, translation_key);
END;
GO

DECLARE @seed TABLE (
    translation_key  NVARCHAR(160) NOT NULL,
    locale           NVARCHAR(10)  NOT NULL,
    translation_text NVARCHAR(MAX) NOT NULL
);

INSERT INTO @seed (translation_key, locale, translation_text) VALUES
    (N'survey.match_over.opt_maybe', N'en', N'Maybe, depends on improvements'),
    (N'survey.match_over.opt_miss_no', N'en', N'Not really'),
    (N'survey.match_over.opt_miss_somewhat', N'en', N'Somewhat disappointed'),
    (N'survey.match_over.opt_miss_stopped', N'en', N'Already stopped playing'),
    (N'survey.match_over.opt_miss_very', N'en', N'Very disappointed'),
    (N'survey.match_over.opt_no', N'en', N'No'),
    (N'survey.match_over.opt_yes', N'en', N'Yes, absolutely'),
    (N'survey.match_over.q1_lost', N'en', N'Was there any moment where you felt lost or didn''t know what to do next?'),
    (N'survey.match_over.q2_feedback', N'en', N'What did you like most and least about this first match?'),
    (N'survey.match_over.q3_return', N'en', N'Will you play again?'),
    (N'survey.match_over.q4_miss', N'en', N'If this game didn''t exist tomorrow, would you miss it?'),
    (N'survey.match_over.q5_email', N'en', N'Add your email to be notified when it releases on Steam / iOS / Android:'),
    (N'survey.match_over.opt_maybe', N'es', N'Quizá, depende de las mejoras'),
    (N'survey.match_over.opt_miss_no', N'es', N'No mucho'),
    (N'survey.match_over.opt_miss_somewhat', N'es', N'Algo'),
    (N'survey.match_over.opt_miss_stopped', N'es', N'Ya dejé de jugar'),
    (N'survey.match_over.opt_miss_very', N'es', N'Mucho'),
    (N'survey.match_over.opt_no', N'es', N'No'),
    (N'survey.match_over.opt_yes', N'es', N'Sí, sin duda'),
    (N'survey.match_over.q1_lost', N'es', N'¿Hubo algún momento en el que te sentiste perdido o no sabías qué hacer después?'),
    (N'survey.match_over.q2_feedback', N'es', N'¿Qué es lo que más y lo que menos te gustó de esta primera partida?'),
    (N'survey.match_over.q3_return', N'es', N'¿Volverás a jugar?'),
    (N'survey.match_over.q4_miss', N'es', N'Si este juego no existiera mañana, ¿lo echarías de menos?'),
    (N'survey.match_over.q5_email', N'es', N'Añade tu correo para avisarte cuando salga en Steam / iOS / Android:'),
    (N'survey.match_over.opt_maybe', N'zh', N'也许会，取决于改进'),
    (N'survey.match_over.opt_miss_no', N'zh', N'不太会'),
    (N'survey.match_over.opt_miss_somewhat', N'zh', N'会有点想念'),
    (N'survey.match_over.opt_miss_stopped', N'zh', N'我已经不玩了'),
    (N'survey.match_over.opt_miss_very', N'zh', N'会非常想念'),
    (N'survey.match_over.opt_no', N'zh', N'不会'),
    (N'survey.match_over.opt_yes', N'zh', N'会，一定会'),
    (N'survey.match_over.q1_lost', N'zh', N'有没有哪个时刻你感到迷茫，不知道下一步该做什么？'),
    (N'survey.match_over.q2_feedback', N'zh', N'这场首战里，你最喜欢和最不喜欢的是什么？'),
    (N'survey.match_over.q3_return', N'zh', N'你还会再玩吗？'),
    (N'survey.match_over.q4_miss', N'zh', N'如果这款游戏明天消失，你会想念它吗？'),
    (N'survey.match_over.q5_email', N'zh', N'留下邮箱，游戏登陆 Steam / iOS / Android 时通知你：'),
    (N'survey.match_over.opt_maybe', N'hi', N'शायद, सुधारों पर निर्भर'),
    (N'survey.match_over.opt_miss_no', N'hi', N'ज़्यादा नहीं'),
    (N'survey.match_over.opt_miss_somewhat', N'hi', N'थोड़ा'),
    (N'survey.match_over.opt_miss_stopped', N'hi', N'मैंने खेलना बंद कर दिया है'),
    (N'survey.match_over.opt_miss_very', N'hi', N'बहुत ज़्यादा'),
    (N'survey.match_over.opt_no', N'hi', N'नहीं'),
    (N'survey.match_over.opt_yes', N'hi', N'हाँ, बिल्कुल'),
    (N'survey.match_over.q1_lost', N'hi', N'क्या कभी ऐसा क्षण आया जब आप खोए हुए महसूस कर रहे थे या समझ नहीं आ रहा था कि आगे क्या करें?'),
    (N'survey.match_over.q2_feedback', N'hi', N'इस पहली बारी में आपको सबसे अच्छा और सबसे बुरा क्या लगा?'),
    (N'survey.match_over.q3_return', N'hi', N'क्या आप फिर खेलेंगे?'),
    (N'survey.match_over.q4_miss', N'hi', N'अगर यह गेम कल न होता, तो क्या आप इसे मिस करते?'),
    (N'survey.match_over.q5_email', N'hi', N'Steam / iOS / Android पर रिलीज़ होने पर सूचना पाने के लिए अपना ईमेल जोड़ें:'),
    (N'survey.match_over.opt_maybe', N'fr', N'Peut-être, selon les améliorations'),
    (N'survey.match_over.opt_miss_no', N'fr', N'Pas vraiment'),
    (N'survey.match_over.opt_miss_somewhat', N'fr', N'Un peu'),
    (N'survey.match_over.opt_miss_stopped', N'fr', N'J''ai déjà arrêté de jouer'),
    (N'survey.match_over.opt_miss_very', N'fr', N'Beaucoup'),
    (N'survey.match_over.opt_no', N'fr', N'Non'),
    (N'survey.match_over.opt_yes', N'fr', N'Oui, absolument'),
    (N'survey.match_over.q1_lost', N'fr', N'Y a-t-il eu un moment où vous vous êtes senti perdu ou ne saviez pas quoi faire ensuite ?'),
    (N'survey.match_over.q2_feedback', N'fr', N'Qu''avez-vous le plus et le moins aimé dans cette première partie ?'),
    (N'survey.match_over.q3_return', N'fr', N'Allez-vous rejouer ?'),
    (N'survey.match_over.q4_miss', N'fr', N'Si ce jeu n''existait pas demain, vous manquerait-il ?'),
    (N'survey.match_over.q5_email', N'fr', N'Ajoutez votre e-mail pour être prévenu de sa sortie sur Steam / iOS / Android :'),
    (N'survey.match_over.opt_maybe', N'ar', N'ربما، حسب التحسينات'),
    (N'survey.match_over.opt_miss_no', N'ar', N'ليس كثيرًا'),
    (N'survey.match_over.opt_miss_somewhat', N'ar', N'قليلًا'),
    (N'survey.match_over.opt_miss_stopped', N'ar', N'لقد توقفت عن اللعب بالفعل'),
    (N'survey.match_over.opt_miss_very', N'ar', N'كثيرًا'),
    (N'survey.match_over.opt_no', N'ar', N'لا'),
    (N'survey.match_over.opt_yes', N'ar', N'نعم، بالتأكيد'),
    (N'survey.match_over.q1_lost', N'ar', N'هل كانت هناك لحظة شعرت فيها بالضياع أو لم تعرف ماذا تفعل بعد ذلك؟'),
    (N'survey.match_over.q2_feedback', N'ar', N'ما الذي أعجبك أكثر وما الذي أعجبك أقل في هذه المباراة الأولى؟'),
    (N'survey.match_over.q3_return', N'ar', N'هل ستلعب مرة أخرى؟'),
    (N'survey.match_over.q4_miss', N'ar', N'لو لم تكن هذه اللعبة موجودة غدًا، هل ستشتاق إليها؟'),
    (N'survey.match_over.q5_email', N'ar', N'أضف بريدك الإلكتروني ليصلك إشعار عند إطلاقها على Steam / iOS / Android:'),
    (N'survey.match_over.opt_maybe', N'bn', N'হয়তো, উন্নতির উপর নির্ভর করে'),
    (N'survey.match_over.opt_miss_no', N'bn', N'বেশ না'),
    (N'survey.match_over.opt_miss_somewhat', N'bn', N'কিছুটা'),
    (N'survey.match_over.opt_miss_stopped', N'bn', N'আমি ইতিমধ্যে খেলা বন্ধ করেছি'),
    (N'survey.match_over.opt_miss_very', N'bn', N'খুব বেশি'),
    (N'survey.match_over.opt_no', N'bn', N'না'),
    (N'survey.match_over.opt_yes', N'bn', N'হ্যাঁ, অবশ্যই'),
    (N'survey.match_over.q1_lost', N'bn', N'কখনো কি এমন মুহূর্ত এসেছে যখন আপনি হারিয়ে গেছেন বা বুঝতে পারেননি পরের কাজ কী?'),
    (N'survey.match_over.q2_feedback', N'bn', N'এই প্রথম ম্যাচে আপনার সবচেয়ে ভালো ও সবচেয়ে খারাপ লেগেছে কী?'),
    (N'survey.match_over.q3_return', N'bn', N'আপনি কি আবার খেলবেন?'),
    (N'survey.match_over.q4_miss', N'bn', N'এই গেমটি যদি কাল না থাকত, আপনি কি এটি মিস করতেন?'),
    (N'survey.match_over.q5_email', N'bn', N'Steam / iOS / Android-এ প্রকাশিত হলে জানাতে আপনার ইমেল যোগ করুন:'),
    (N'survey.match_over.opt_maybe', N'pt', N'Talvez, depende das melhorias'),
    (N'survey.match_over.opt_miss_no', N'pt', N'Não muito'),
    (N'survey.match_over.opt_miss_somewhat', N'pt', N'Alguma falta'),
    (N'survey.match_over.opt_miss_stopped', N'pt', N'Já deixei de jogar'),
    (N'survey.match_over.opt_miss_very', N'pt', N'Muita falta'),
    (N'survey.match_over.opt_no', N'pt', N'Não'),
    (N'survey.match_over.opt_yes', N'pt', N'Sim, sem dúvida'),
    (N'survey.match_over.q1_lost', N'pt', N'Houve algum momento em que se sentiu perdido ou não sabia o que fazer a seguir?'),
    (N'survey.match_over.q2_feedback', N'pt', N'Do que gostou mais e menos nesta primeira partida?'),
    (N'survey.match_over.q3_return', N'pt', N'Vai voltar a jogar?'),
    (N'survey.match_over.q4_miss', N'pt', N'Se este jogo não existisse amanhã, sentiria falta dele?'),
    (N'survey.match_over.q5_email', N'pt', N'Adicione o seu e-mail para ser avisado quando sair na Steam / iOS / Android:'),
    (N'survey.match_over.opt_maybe', N'ru', N'Может быть, зависит от улучшений'),
    (N'survey.match_over.opt_miss_no', N'ru', N'Не сильно'),
    (N'survey.match_over.opt_miss_somewhat', N'ru', N'Немного'),
    (N'survey.match_over.opt_miss_stopped', N'ru', N'Я уже перестал играть'),
    (N'survey.match_over.opt_miss_very', N'ru', N'Очень'),
    (N'survey.match_over.opt_no', N'ru', N'Нет'),
    (N'survey.match_over.opt_yes', N'ru', N'Да, обязательно'),
    (N'survey.match_over.q1_lost', N'ru', N'Был ли момент, когда вы потерялись или не знали, что делать дальше?'),
    (N'survey.match_over.q2_feedback', N'ru', N'Что вам понравилось больше всего и меньше всего в этом первом матче?'),
    (N'survey.match_over.q3_return', N'ru', N'Будете играть снова?'),
    (N'survey.match_over.q4_miss', N'ru', N'Если бы этой игры не было завтра, вы бы по ней скучали?'),
    (N'survey.match_over.q5_email', N'ru', N'Добавьте почту, чтобы получить уведомление о выходе в Steam / iOS / Android:'),
    (N'survey.match_over.opt_maybe', N'de', N'Vielleicht, kommt auf die Verbesserungen an'),
    (N'survey.match_over.opt_miss_no', N'de', N'Nicht wirklich'),
    (N'survey.match_over.opt_miss_somewhat', N'de', N'Etwas'),
    (N'survey.match_over.opt_miss_stopped', N'de', N'Ich habe schon aufgehört zu spielen'),
    (N'survey.match_over.opt_miss_very', N'de', N'Sehr'),
    (N'survey.match_over.opt_no', N'de', N'Nein'),
    (N'survey.match_over.opt_yes', N'de', N'Ja, auf jeden Fall'),
    (N'survey.match_over.q1_lost', N'de', N'Gab es einen Moment, in dem du dich verloren gefühlt hast oder nicht wusstest, was du als Nächstes tun sollst?'),
    (N'survey.match_over.q2_feedback', N'de', N'Was hat dir an dieser ersten Partie am besten und am wenigsten gefallen?'),
    (N'survey.match_over.q3_return', N'de', N'Wirst du wieder spielen?'),
    (N'survey.match_over.q4_miss', N'de', N'Wenn es dieses Spiel morgen nicht mehr gäbe, würdest du es vermissen?'),
    (N'survey.match_over.q5_email', N'de', N'Füge deine E-Mail hinzu, um benachrichtigt zu werden, wenn es für Steam / iOS / Android erscheint:'),
    (N'survey.match_over.opt_maybe', N'ja', N'改善次第では'),
    (N'survey.match_over.opt_miss_no', N'ja', N'あまり'),
    (N'survey.match_over.opt_miss_somewhat', N'ja', N'少し寂しい'),
    (N'survey.match_over.opt_miss_stopped', N'ja', N'もう遊ぶのをやめた'),
    (N'survey.match_over.opt_miss_very', N'ja', N'とても寂しい'),
    (N'survey.match_over.opt_no', N'ja', N'いいえ'),
    (N'survey.match_over.opt_yes', N'ja', N'はい、ぜひ'),
    (N'survey.match_over.q1_lost', N'ja', N'どこかで迷ったり、次に何をすればいいか分からないと感じた瞬間はありましたか？'),
    (N'survey.match_over.q2_feedback', N'ja', N'この最初の対戦で、一番良かった点と一番気になった点は何ですか？'),
    (N'survey.match_over.q3_return', N'ja', N'また遊びますか？'),
    (N'survey.match_over.q4_miss', N'ja', N'このゲームが明日なくなったら、寂しくなりますか？'),
    (N'survey.match_over.q5_email', N'ja', N'Steam / iOS / Android でのリリース通知を受け取るメールアドレスを追加：'),
    (N'survey.match_over.opt_maybe', N'ko', N'개선에 따라 다를 것 같아요'),
    (N'survey.match_over.opt_miss_no', N'ko', N'별로'),
    (N'survey.match_over.opt_miss_somewhat', N'ko', N'조금 아쉬울 것 같아요'),
    (N'survey.match_over.opt_miss_stopped', N'ko', N'이미 플레이를 그만뒀어요'),
    (N'survey.match_over.opt_miss_very', N'ko', N'매우 아쉬울 것 같아요'),
    (N'survey.match_over.opt_no', N'ko', N'아니요'),
    (N'survey.match_over.opt_yes', N'ko', N'네, 꼭'),
    (N'survey.match_over.q1_lost', N'ko', N'길을 잃었다고 느끼거나 다음에 무엇을 해야 할지 모르는 순간이 있었나요?'),
    (N'survey.match_over.q2_feedback', N'ko', N'이번 첫 경기에서 가장 좋았던 점과 가장 아쉬웠던 점은 무엇인가요?'),
    (N'survey.match_over.q3_return', N'ko', N'다시 플레이하시겠어요?'),
    (N'survey.match_over.q4_miss', N'ko', N'이 게임이 내일 사라진다면 아쉬울 것 같나요?'),
    (N'survey.match_over.q5_email', N'ko', N'Steam / iOS / Android 출시 알림을 받을 이메일을 추가하세요:'),
    (N'survey.match_over.opt_maybe', N'it', N'Forse, dipende dai miglioramenti'),
    (N'survey.match_over.opt_miss_no', N'it', N'Non molto'),
    (N'survey.match_over.opt_miss_somewhat', N'it', N'Un po'''),
    (N'survey.match_over.opt_miss_stopped', N'it', N'Ho già smesso di giocare'),
    (N'survey.match_over.opt_miss_very', N'it', N'Moltissimo'),
    (N'survey.match_over.opt_no', N'it', N'No'),
    (N'survey.match_over.opt_yes', N'it', N'Sì, assolutamente'),
    (N'survey.match_over.q1_lost', N'it', N'C''è stato un momento in cui ti sei sentito perso o non sapevi cosa fare dopo?'),
    (N'survey.match_over.q2_feedback', N'it', N'Cosa ti è piaciuto di più e di meno di questa prima partita?'),
    (N'survey.match_over.q3_return', N'it', N'Giocherai di nuovo?'),
    (N'survey.match_over.q4_miss', N'it', N'Se questo gioco non esistesse domani, ti mancherebbe?'),
    (N'survey.match_over.q5_email', N'it', N'Aggiungi la tua email per essere avvisato dell''uscita su Steam / iOS / Android:');

MERGE dbo.hf_survey_translations AS dst
USING @seed AS src
    ON dst.translation_key = src.translation_key AND dst.locale = src.locale
WHEN MATCHED THEN
    UPDATE SET translation_text = src.translation_text, updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (translation_key, locale, translation_text)
    VALUES (src.translation_key, src.locale, src.translation_text);
GO

-- Comprobación: 13 filas, una por idioma.
SELECT locale, COUNT(*) AS claves
FROM dbo.hf_survey_translations
GROUP BY locale
ORDER BY locale;
