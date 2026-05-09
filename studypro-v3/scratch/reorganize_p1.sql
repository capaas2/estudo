-- Script para popular Períodos e Matérias do 1º Período
DO $$
DECLARE
    user_id_val uuid := 'a842c0fc-ea84-4acb-9ed2-4611100c8140'; -- gustavocapaz06@gmail.com
    periodo_1_id uuid;
BEGIN
    -- Garantir que os 12 períodos existam para este usuário
    FOR i IN 1..12 LOOP
        INSERT INTO periods (user_id, numero, nome, status)
        VALUES (user_id_val, i, i || 'º Período', CASE WHEN i = 1 THEN 'em_andamento' ELSE 'nao_iniciado' END)
        ON CONFLICT (user_id, numero) DO NOTHING;
    END LOOP;

    -- Obter ID do 1º Período
    SELECT id INTO periodo_1_id FROM periods WHERE user_id = user_id_val AND numero = 1;

    -- Limpar workspace do 1º período para evitar duplicatas nesta reconfiguração
    DELETE FROM subjects_workspace WHERE user_id = user_id_val AND period_id = periodo_1_id;

    -- Inserir Matérias do 1º Período
    -- Anatomia Humana I
    INSERT INTO subjects_workspace (user_id, period_id, materia_id, carga_horaria, status)
    SELECT user_id_val, periodo_1_id, id, 40, 'cursando' FROM materias WHERE nome ILIKE 'Anatomia Humana I' LIMIT 1;

    -- Genética e Embriologia
    INSERT INTO subjects_workspace (user_id, period_id, materia_id, carga_horaria, status)
    SELECT user_id_val, periodo_1_id, id, 104, 'cursando' FROM materias WHERE nome ILIKE 'Genética e Embriologia' LIMIT 1;

    -- Habilidades, Atitudes e Comunicação I
    INSERT INTO subjects_workspace (user_id, period_id, materia_id, carga_horaria, status)
    SELECT user_id_val, periodo_1_id, id, 80, 'cursando' FROM materias WHERE nome ILIKE 'Habilidades, Atitudes e Comunicação I' LIMIT 1;

    -- Histologia
    INSERT INTO subjects_workspace (user_id, period_id, materia_id, carga_horaria, status)
    SELECT user_id_val, periodo_1_id, id, 40, 'cursando' FROM materias WHERE nome ILIKE 'Histologia' LIMIT 1;

    -- Homeostasia I
    INSERT INTO subjects_workspace (user_id, period_id, materia_id, carga_horaria, status)
    SELECT user_id_val, periodo_1_id, id, 122, 'cursando' FROM materias WHERE nome ILIKE 'Homeostasia I' LIMIT 1;

    -- Homeostasia II
    INSERT INTO subjects_workspace (user_id, period_id, materia_id, carga_horaria, status)
    SELECT user_id_val, periodo_1_id, id, 122, 'cursando' FROM materias WHERE nome ILIKE 'Homeostasia II' LIMIT 1;

    -- Programa de Interação Serviço Ensino Comunidades I
    INSERT INTO subjects_workspace (user_id, period_id, materia_id, carga_horaria, status)
    SELECT user_id_val, periodo_1_id, id, 80, 'cursando' FROM materias WHERE nome ILIKE 'Programa de Interação Serviço Ensino Comunidades I' LIMIT 1;

END $$;
