# Pacto Sagrado y diplomacia: decisiones de diseño conservadas

Esta nota mantiene la intención funcional del diseño y la separa de la implementación. Para el estado real y el orden de integración, consulta [`arquitectura_diplomacia.md`](arquitectura_diplomacia.md); el código vigente está en `js/diplomacy*.js`.

## Principios funcionales

1. **Pacto Sagrado:** un PNA debe comunicar con claridad su duración y condiciones; no presentes como irrevocable un acuerdo si el estado/código permiten romperlo. La interfaz marca `breakPenalty: 0` como Pacto Sagrado y el control efectivo de ataque es `HF.Diplomacy.canAttack()`.
2. **Diplomacia como logística:** un PNA puede asegurar un flanco; el comercio debe representar rutas y valor de recursos, no una etiqueta sin efecto.
3. **Economía de supervivencia:** los préstamos deben mostrar deuda, pagos y consecuencias. La IA debe valorar la amenaza, confianza y escasez antes de proponer tratados.
4. **Compatibilidad:** estado diplomático nuevo debe sobrevivir serialización, reanudación y undo; los formatos heredados deben normalizarse sin impedir el turno.

## Límite entre diseño y código

El código actual implementa tratados PNA/comercio/préstamo/tregua, decisiones diplomáticas de IA y una pantalla de diplomacia. La implementación detallada y sus pruebas están documentadas en [`arquitectura_diplomacia.md`](arquitectura_diplomacia.md) y `tester_qa/diplomacy_test.js`.

Los detalles más amplios de la especificación original —incluyendo reglas adicionales de rutas, garantías, sanciones o balance— no deben tratarse como entregados por estar escritos aquí. Antes de reintroducir una regla, contrástala con los módulos y añade una prueba de regresión. Las pruebas no se ejecutaron en la revisión actual porque Node.js/npm no estaban disponibles.
