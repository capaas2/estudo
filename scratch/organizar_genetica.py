import os
import json
from supabase import create_client, Client

# Configuração via variáveis de ambiente (as ferramentas do MCP as fornecem internamente)
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

materia_id = 'e5b636c2-f85e-44c5-9565-479397acf5c3'

def organizar_questoes():
    # 1. Buscar todas as questões da matéria de Genética que não têm subtema
    res = supabase.table('questoes').select('*').eq('materia_id', materia_id).is_('subtema_id', 'null').execute()
    questoes = res.data
    
    if not questoes:
        print("Nenhuma questão sem subtema encontrada.")
        return

    # 2. Cache de subtemas existentes
    res_subs = supabase.table('subtemas').select('*').eq('materia_id', materia_id).execute()
    mapa_subtemas = {s['nome'].lower().strip(): s['id'] for s in res_subs.data}

    for q in questoes:
        tags = q.get('tags', [])
        # Ignorar tags genéricas
        tags_limpas = [t for t in tags if t.lower() not in ['biologia', 'genética', 'genetica']]
        
        # Nome do subtema: primeira tag específica ou 'Geral'
        nome_sub = tags_limpas[0] if tags_limpas else 'Geral'
        nome_norm = nome_sub.lower().strip()

        subtema_id = None
        if nome_norm in mapa_subtemas:
            subtema_id = mapa_subtemas[nome_norm]
        else:
            # Criar novo subtema
            res_novo = supabase.table('subtemas').insert({
                'materia_id': materia_id,
                'nome': nome_sub
            }).execute()
            if res_novo.data:
                subtema_id = res_novo.data[0]['id']
                mapa_subtemas[nome_norm] = subtema_id
                print(f"Criado subtema: {nome_sub}")

        # 3. Atualizar a questão
        if subtema_id:
            supabase.table('questoes').update({'subtema_id': subtema_id}).eq('id', q['id']).execute()
            print(f"Questão {q['id'][:8]} movida para subtema: {nome_sub}")

if __name__ == "__main__":
    organizar_questoes()
