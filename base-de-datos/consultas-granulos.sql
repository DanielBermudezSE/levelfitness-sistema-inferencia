-- ============================================================================
-- Sistema experto Level Fitness — consultas de gránulos de conocimiento
-- Gránulo de conocimiento = una regla SI <condiciones> ENTONCES <conclusión> [FC]
-- SGBD: PostgreSQL 16
-- ============================================================================

-- Q1. Inventario de la base de conocimiento cargada
SELECT 'Variables de entrada'  AS elemento, count(*) AS cantidad FROM expert_variable WHERE kind = 'input'   AND deleted_at IS NULL
UNION ALL SELECT 'Variables deducidas',   count(*) FROM expert_variable WHERE kind = 'derived' AND deleted_at IS NULL
UNION ALL SELECT 'Opciones de variables', count(*) FROM expert_variable_option WHERE deleted_at IS NULL
UNION ALL SELECT 'Hipótesis',             count(*) FROM expert_hypothesis WHERE deleted_at IS NULL
UNION ALL SELECT 'Reglas de hechos',      count(*) FROM expert_rule WHERE conclusion_type = 'fact' AND deleted_at IS NULL
UNION ALL SELECT 'Reglas de hipótesis',   count(*) FROM expert_rule WHERE conclusion_type = 'hypothesis' AND deleted_at IS NULL
UNION ALL SELECT 'Condiciones',           count(*) FROM expert_rule_condition WHERE deleted_at IS NULL;

-- Q2. Gránulos por hipótesis: evidencia a favor, en contra y vetos
SELECT h.code                                                       AS hipotesis,
       count(*) FILTER (WHERE r.certainty > 0)                      AS a_favor,
       count(*) FILTER (WHERE r.certainty < 0 AND r.certainty > -1) AS en_contra,
       count(*) FILTER (WHERE r.certainty = -1)                     AS vetos,
       max(r.certainty)                                             AS fc_max,
       min(r.certainty)                                             AS fc_min
FROM expert_hypothesis h
JOIN expert_rule r ON r.hypothesis_id = h.id AND r.deleted_at IS NULL AND r.active
WHERE h.deleted_at IS NULL
GROUP BY h.code, h.sort_order
ORDER BY h.sort_order;

-- Q3. Gránulos de UNA hipótesis en forma SI–ENTONCES (cambiar el código: :'hipotesis')
--     Ejemplo en psql:  \set hipotesis 'creatina'
SELECT r.code,
       'SI ' || string_agg(
                  v.name || ' ' ||
                  CASE c.operator WHEN 'eq' THEN '=' WHEN 'neq' THEN '≠' WHEN 'in' THEN '∈'
                                  WHEN 'not_in' THEN '∉' WHEN 'gt' THEN '>' WHEN 'gte' THEN '≥'
                                  WHEN 'lt' THEN '<' WHEN 'lte' THEN '≤' WHEN 'contains' THEN 'incluye'
                                  ELSE 'no incluye' END || ' ' || c.value,
                  ' Y ' ORDER BY c.sort_order)
             || ' ENTONCES ' || h.name AS granulo,
       r.certainty AS fc
FROM expert_rule r
JOIN expert_hypothesis h     ON h.id = r.hypothesis_id
JOIN expert_rule_condition c ON c.rule_id = r.id AND c.deleted_at IS NULL
JOIN expert_variable v       ON v.id = c.variable_id
WHERE h.code = :'hipotesis' AND r.deleted_at IS NULL
GROUP BY r.code, h.name, r.certainty
ORDER BY r.certainty DESC, r.code;

-- Q4. Gránulos que deducen un hecho intermedio (ejemplo: evitar_estimulantes)
SELECT r.code,
       'SI ' || string_agg(v.name || ' ' || c.operator || ' ' || c.value, ' Y ' ORDER BY c.sort_order)
             || ' ENTONCES ' || cv.name || ' = ' || r.conclusion_value AS granulo,
       r.certainty AS fc
FROM expert_rule r
JOIN expert_variable cv      ON cv.id = r.conclusion_variable_id
JOIN expert_rule_condition c ON c.rule_id = r.id AND c.deleted_at IS NULL
JOIN expert_variable v       ON v.id = c.variable_id
WHERE cv.code = 'evitar_estimulantes' AND r.deleted_at IS NULL
GROUP BY r.code, cv.name, r.conclusion_value, r.certainty
ORDER BY r.code;

-- Q5. Encadenamiento: hipótesis cuyas reglas dependen de hechos deducidos
SELECT h.code                            AS hipotesis,
       string_agg(DISTINCT v.code, ', ') AS hechos_deducidos_usados,
       count(DISTINCT r.id)              AS reglas_encadenadas
FROM expert_rule r
JOIN expert_hypothesis h     ON h.id = r.hypothesis_id
JOIN expert_rule_condition c ON c.rule_id = r.id AND c.deleted_at IS NULL
JOIN expert_variable v       ON v.id = c.variable_id AND v.kind = 'derived'
WHERE r.deleted_at IS NULL
GROUP BY h.code
ORDER BY reglas_encadenadas DESC, h.code;

-- Q6. Sistema transaccional: comportamiento de cada hipótesis en las consultas registradas
SELECT h.code AS hipotesis,
       count(*) FILTER (WHERE cr.status = 'recommended') AS recomendada,
       count(*) FILTER (WHERE cr.status = 'optional')    AS opcional,
       count(*) FILTER (WHERE cr.status = 'rejected')    AS descartada,
       count(*) FILTER (WHERE cr.status = 'advice')      AS aviso,
       round(avg(cr.certainty)::numeric, 2)              AS fc_promedio
FROM expert_consultation_result cr
JOIN expert_hypothesis h ON h.id = cr.hypothesis_id
WHERE cr.deleted_at IS NULL
GROUP BY h.code
ORDER BY recomendada DESC, h.code;
