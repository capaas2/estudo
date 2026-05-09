-- Script Completo de Reorganização Acadêmica (1º ao 5º Período)
DO $$
DECLARE
    user_id_val uuid := 'a842c0fc-ea84-4acb-9ed2-4611100c8140';
    p_id uuid;
BEGIN
    -- 1. Garantir períodos
    FOR i IN 1..12 LOOP
        INSERT INTO periods (user_id, numero, nome, status)
        VALUES (user_id_val, i, i || 'º Período', 'nao_iniciado')
        ON CONFLICT (user_id, numero) DO NOTHING;
    END LOOP;

    -- Limpar workspace atual para reconstruir
    DELETE FROM subjects_workspace WHERE user_id = user_id_val;

    -- 2. PRIMEIRO PERÍODO
    SELECT id INTO p_id FROM periods WHERE user_id = user_id_val AND numero = 1;
    UPDATE periods SET status = 'em_andamento' WHERE id = p_id;
    
    INSERT INTO subjects_workspace (user_id, period_id, materia_id, carga_horaria)
    SELECT user_id_val, p_id, id, 40 FROM materias WHERE nome ILIKE 'Anatomia Humana I' UNION ALL
    SELECT user_id_val, p_id, id, 104 FROM materias WHERE nome ILIKE 'Genética e Embriologia' UNION ALL
    SELECT user_id_val, p_id, id, 80 FROM materias WHERE nome ILIKE 'Habilidades, Atitudes e Comunicação I' UNION ALL
    SELECT user_id_val, p_id, id, 40 FROM materias WHERE nome ILIKE 'Histologia' UNION ALL
    SELECT user_id_val, p_id, id, 122 FROM materias WHERE nome ILIKE 'Homeostasia I' UNION ALL
    SELECT user_id_val, p_id, id, 122 FROM materias WHERE nome ILIKE 'Homeostasia II' UNION ALL
    SELECT user_id_val, p_id, id, 80 FROM materias WHERE nome ILIKE 'Programa de Interação Serviço Ensino Comunidades I';

    -- 3. SEGUNDO PERÍODO
    SELECT id INTO p_id FROM periods WHERE user_id = user_id_val AND numero = 2;
    INSERT INTO subjects_workspace (user_id, period_id, materia_id, carga_horaria)
    SELECT user_id_val, p_id, id, 80 FROM materias WHERE nome ILIKE 'Habilidades, Atitudes e Comunicação II' UNION ALL
    SELECT user_id_val, p_id, id, 122 FROM materias WHERE nome ILIKE 'Metabolismo I' UNION ALL
    SELECT user_id_val, p_id, id, 104 FROM materias WHERE nome ILIKE 'Metabolismo II' UNION ALL
    SELECT user_id_val, p_id, id, 40 FROM materias WHERE nome ILIKE 'Neuroanatomia' UNION ALL
    SELECT user_id_val, p_id, id, 80 FROM materias WHERE nome ILIKE 'Programa de Interação Serviço Ensino Comunidade II' UNION ALL
    SELECT user_id_val, p_id, id, 122 FROM materias WHERE nome ILIKE 'Sistema Nervoso';

    -- 4. TERCEIRO PERÍODO
    SELECT id INTO p_id FROM periods WHERE user_id = user_id_val AND numero = 3;
    INSERT INTO subjects_workspace (user_id, period_id, materia_id, carga_horaria)
    SELECT user_id_val, p_id, id, 40 FROM materias WHERE nome ILIKE 'Anatomia Humana II' UNION ALL
    SELECT user_id_val, p_id, id, 80 FROM materias WHERE nome ILIKE 'Habilidades, Atitudes e Comunicação III' UNION ALL
    SELECT user_id_val, p_id, id, 40 FROM materias WHERE nome ILIKE 'Histologia II' UNION ALL
    SELECT user_id_val, p_id, id, 104 FROM materias WHERE nome ILIKE 'Interação com o Meio Ambiente' UNION ALL
    SELECT user_id_val, p_id, id, 80 FROM materias WHERE nome ILIKE 'Programa de Interação Serviço Ensino e Comunidade III' UNION ALL
    SELECT user_id_val, p_id, id, 122 FROM materias WHERE nome ILIKE 'Sistema Circulatório' UNION ALL
    SELECT user_id_val, p_id, id, 122 FROM materias WHERE nome ILIKE 'Sistema Locomotor';

    -- 5. QUARTO PERÍODO
    SELECT id INTO p_id FROM periods WHERE user_id = user_id_val AND numero = 4;
    INSERT INTO subjects_workspace (user_id, period_id, materia_id, carga_horaria)
    SELECT user_id_val, p_id, id, 80 FROM materias WHERE nome ILIKE 'Habilidades, Atitudes e Comunicação IV' UNION ALL
    SELECT user_id_val, p_id, id, 40 FROM materias WHERE nome ILIKE 'Optativa I' UNION ALL
    SELECT user_id_val, p_id, id, 40 FROM materias WHERE nome ILIKE 'Patologia Geral' UNION ALL
    SELECT user_id_val, p_id, id, 80 FROM materias WHERE nome ILIKE 'Programa de Interação Serviço Ensino Comunidade IV' UNION ALL
    SELECT user_id_val, p_id, id, 122 FROM materias WHERE nome ILIKE 'Sistema Digestório' UNION ALL
    SELECT user_id_val, p_id, id, 104 FROM materias WHERE nome ILIKE 'Sistema Respiratório' UNION ALL
    SELECT user_id_val, p_id, id, 122 FROM materias WHERE nome ILIKE 'Sistema Urinário';

    -- 6. QUINTO PERÍODO
    SELECT id INTO p_id FROM periods WHERE user_id = user_id_val AND numero = 5;
    INSERT INTO subjects_workspace (user_id, period_id, materia_id, carga_horaria)
    SELECT user_id_val, p_id, id, 40 FROM materias WHERE nome ILIKE 'Anatomia Patológica e Fisiopatologia I' UNION ALL
    SELECT user_id_val, p_id, id, 122 FROM materias WHERE nome ILIKE 'Dermatologia e Carcinogênese' UNION ALL
    SELECT user_id_val, p_id, id, 40 FROM materias WHERE nome ILIKE 'Farmacologia Básica' UNION ALL
    SELECT user_id_val, p_id, id, 80 FROM materias WHERE nome ILIKE 'Habilidades, Atitudes e Comunicação V' UNION ALL
    SELECT user_id_val, p_id, id, 40 FROM materias WHERE nome ILIKE 'Optativa II' UNION ALL
    SELECT user_id_val, p_id, id, 80 FROM materias WHERE nome ILIKE 'Programa de Interação Serviço Ensino Comunidade V' UNION ALL
    SELECT user_id_val, p_id, id, 40 FROM materias WHERE nome ILIKE 'Radiologia e Diagnóstico por Imagem' UNION ALL
    SELECT user_id_val, p_id, id, 40 FROM materias WHERE nome ILIKE 'Saúde Mental e Comportamento' UNION ALL
    SELECT user_id_val, p_id, id, 122 FROM materias WHERE nome ILIKE 'Sistema Hemolinfopoiético';

END $$;
