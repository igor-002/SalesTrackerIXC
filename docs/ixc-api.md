# IXC Provedor — Documentação da API (Clientes e Contratos)

> Referência completa dos endpoints disponíveis. Atualizado em 2026-04-13.

## Informações Gerais

| Campo | Valor |
|---|---|
| Base URL | `https://{meudominio.com.br}/webservice/v1` |
| Autenticação | Basic Auth — usuário + token webservice |
| Header GET obrigatório | `ixcsoft: listar` |

### Parâmetros de paginação (GET)

| Parâmetro | Descrição |
|---|---|
| `qtype` | Campo para filtrar (ex: `cliente.id`) |
| `query` | Valor do filtro |
| `oper` | Operador (`=`, `>=`, `<=`, etc.) |
| `page` | Página atual |
| `rp` | Registros por página |
| `sortname` | Campo de ordenação |
| `sortorder` | `asc` ou `desc` |
| `grid_param` | Parâmetros extras de grid |

---

## Clientes

### CRUD `/cliente`

| Método | URL | Descrição |
|---|---|---|
| GET | `/cliente` | Listar clientes (header `ixcsoft: listar`) |
| POST | `/cliente` | Inserir cliente |
| PUT | `/cliente/{id}` | Editar cliente (enviar TODOS os campos) |
| DELETE | `/cliente/{id}` | Deletar cliente |

**Campos obrigatórios (POST/PUT):**
```json
{
  "ativo": "S",
  "tipo_pessoa": "F",
  "razao": "Nome do Cliente",
  "cnpj_cpf": "175.181.720-20",
  "contribuinte_icms": "I",
  "tipo_assinante": "1",
  "cep": "89814-680",
  "endereco": "Rua Exemplo",
  "numero": "100",
  "bairro": "Centro",
  "cidade": "4376",
  "uf": "2",
  "tipo_localidade": "U",
  "iss_classificacao_padrao": "00"
}
```

**Campos opcionais:** `email`, `fone`, `telefone_celular`, `data_nascimento`, `obs`, `whatsapp`, `fantasia`, `ie_identidade`

**Exemplo de resposta (GET):**
```json
{
  "total": "1",
  "registros": [
    {
      "id": "1",
      "razao": "João Silva",
      "cnpj_cpf": "175.181.720-20",
      "tipo_pessoa": "F",
      "ativo": "S"
    }
  ]
}
```

---

### Arquivos do Cliente `/cliente_arquivos`

| Método | URL | Descrição |
|---|---|---|
| GET | `/cliente_arquivos` | Listar arquivos (`qtype: cliente_arquivos.id_cliente`) |
| POST | `/cliente_arquivos` | Inserir arquivo |
| DELETE | `/cliente_arquivos/{id}` | Deletar arquivo |

---

### Ações do Cliente

| Ação | Método | URL |
|---|---|---|
| Enviar SMS | POST | `/botaoAjax_22282` |
| Enviar Omnichannel | POST | `/botaoAjax_22282` |
| Enviar Push | POST | `/botao_rel_26658` |
| Visualizar Arquivo (base64) | POST | `/cliente_arquivo` |
| Consulta SPC/Serasa | GET | `/consulta_spc_serasa` |
| Bloquear/Desbloquear SIP | POST | `/bloquear_desbloquear_sip` |

**Enviar SMS (body):**
```json
{
  "tipo_envio_mensagem": "sms",
  "celular": "(49) 99999-9999",
  "id_gateway": "3",
  "mensagem": "Texto da mensagem",
  "id_cliente": "7149"
}
```

**Enviar Omnichannel (body):**
```json
{
  "tipo_envio_mensagem": "omnichannel",
  "celular": "4911115555",
  "id_cliente": "1",
  "msg_omnichannel": "24"
}
```

---

## Contratos

### CRUD `/cliente_contrato`

| Método | URL | Descrição |
|---|---|---|
| GET | `/cliente_contrato` | Listar contratos |
| POST | `/cliente_contrato` | Inserir contrato |
| PUT | `/cliente_contrato/{id}` | Editar contrato (enviar TODOS os campos) |
| DELETE | `/cliente_contrato/{id}` | Deletar contrato |

**Campos obrigatórios (POST):**
```json
{
  "tipo": "I",
  "id_cliente": "2",
  "id_vd_contrato": "1",
  "contrato": "Plano Teste"
}
```

---

### Status do Contrato

| Ação | Método | URL | Body |
|---|---|---|---|
| Ativar | POST | `/cliente_contrato_ativar_cliente` | `{ "id_contrato": "12" }` |
| Cancelar + financeiro não vencido | POST | `/desativar_cancelar_financeiro_nao_vencido` | `{ "id_contrato", "data_cancelamento", "motivo_cancelamento", "obs_cancelamento" }` |
| Negativar | POST | `/negativar_bloquear` | `{ "id": "2294", "id_cliente": "3" }` |
| Aguardando Assinatura (AA) | POST | `/cliente_contrato_23529` | `{ "id_contrato": "10" }` |
| Liberar Manualmente (A) | POST | `/cliente_contrato_15464` | `{ "id_contrato": "10" }` |
| Desbloqueio Confiança | POST | `/desbloqueio_confianca` | `{ "id": "1" }` |
| Financeiro em Atraso (FA) | POST | `/cliente_contrato_avisar_atraso` | `{ "id_contrato": "10" }` |
| Bloqueio Manual (CM) | POST | `/cliente_contrato_bloquear` | `{ "id_contrato": "10" }` |
| Liberar Temporariamente | POST | `/cliente_contrato_liberar_temp` | `{ "id_contrato": "10" }` |
| Liberar da Redução de Velocidade | POST | `/cliente_contrato_liberar_reducao` | `{ "id_contrato": "10" }` |

---

### Ações do Contrato

| Ação | Método | URL |
|---|---|---|
| Gerar Financeiro | POST | `/gerar_financeiro_contrato` |
| Imprimir Contrato | POST | `/imprimir_contrato` |
| Imprimir Termo | POST | `/imprimir_termo` |
| Gerar doc assinatura digital (IXC Assina) | POST | `/ixc_assina_gerar_documento` |
| Reenviar link assinatura digital | POST | `/ixc_assina_reenviar_link` |

---

### Produtos do Contrato `/vd_contratos_produtos`

| Método | URL | Descrição |
|---|---|---|
| GET | `/vd_contratos_produtos` | Listar produtos (`qtype: vd_contratos_produtos.id_contrato`) |
| POST | `/vd_contratos_produtos` | Inserir produto |
| PUT | `/vd_contratos_produtos/{id}` | Editar produto |
| DELETE | `/vd_contratos_produtos/{id}` | Deletar produto |

**Campos obrigatórios (POST):**
```json
{
  "tipo": "I",
  "id_plano": "1",
  "qtde": "1",
  "valor_unit": "103.00"
}
```

---

### Descontos `/cliente_contrato_descontos`

| Método | URL |
|---|---|
| GET | `/cliente_contrato_descontos` |
| POST | `/cliente_contrato_descontos` |
| PUT | `/cliente_contrato_descontos/{id}` |
| DELETE | `/cliente_contrato_descontos/{id}` |

**Campos obrigatórios (POST):**
```json
{
  "id_contrato": "ID do contrato",
  "id_vd_contrato_produtos": "ID do produto no contrato",
  "descricao": "Desconto Teste",
  "valor": "1.12",
  "data_inicio": "",
  "data_fim": ""
}
```

---

### Acréscimos `/cliente_contrato_acrescimos`

| Método | URL |
|---|---|
| GET | `/cliente_contrato_acrescimos` |
| POST | `/cliente_contrato_acrescimos` |
| PUT | `/cliente_contrato_acrescimos/{id}` |
| DELETE | `/cliente_contrato_acrescimos/{id}` |

---

### Serviços e Descontos Adicionais `/cliente_contrato_servicos`

| Método | URL | Observação |
|---|---|---|
| GET | `/cliente_contrato_servicos` | `tipo_acres_desc = A` para serviços, `D` para descontos |
| POST | `/cliente_contrato_servicos` | Inserir serviço ou desconto adicional |
| PUT | `/cliente_contrato_servicos/{id}` | Editar |
| DELETE | `/cliente_contrato_servicos/{id}` | Deletar |

**Campos obrigatórios — Serviço Adicional:**
```json
{
  "tipo": "I",
  "id_produto": "1",
  "descricao": "Produto adicional",
  "id_unidade": "13",
  "quantidade": "1",
  "valor_unitario": "10.00"
}
```

**Campos obrigatórios — Desconto Adicional:**
```json
{
  "id_produto": "1",
  "descricao": "Produto Desconto",
  "id_produto_contrato_vinc": "151",
  "id_unidade": "13",
  "quantidade": "1"
}
```

---

### Financeiro `/fn_areceber`

| Ação | Método | URL |
|---|---|---|
| Listar boletos | GET | `/fn_areceber` |
| Baixa manual | POST | `/fn_areceber_recebimentos_baixas_novo` |
| Alterar boleto | PUT | `/fn_areceber_altera/{id}` |
| Segunda via / download (base64) | POST | `/get_boleto` |
| Enviar boleto por e-mail | POST | `/get_boleto` |
| Enviar boleto por SMS | POST | `/get_boleto` |
| Get Pix | POST | `/get_pix` |

**Listar boletos (body):**
```json
{
  "qtype": "fn_areceber.id_contrato",
  "query": "2",
  "oper": "=",
  "rp": "200000",
  "sortname": "fn_areceber.data_vencimento"
}
```

**Download boleto (body):**
```json
{
  "boletos": "ID(s) do(s) boleto(s)",
  "juro": "",
  "multa": "",
  "atualiza_boleto": "",
  "tipo_boleto": "arquivo",
  "base64": "S"
}
```

**Get Pix (body):**
```json
{ "id_areceber": "ID do boleto" }
```

**Baixa manual (campos obrigatórios):** `id_receber`, `id_conta`, `tipo_recebimento`, `data`

**Alterar boleto (campos):** `documento`, `data_emissao`, `data_vencimento`, `id_carteira_cobranca`, `status`

---

### Histórico `/cliente_contrato_historico`

| Método | URL |
|---|---|
| GET | `/cliente_contrato_historico` |
| POST | `/cliente_contrato_historico` |
| PUT | `/cliente_contrato_historico/{id}` |
| DELETE | `/cliente_contrato_historico/{id}` |

**Campos obrigatórios (POST):**
```json
{
  "tipo": "Atualiza assinatura",
  "data": "18/06/2024",
  "historico": "Descrição do histórico",
  "id_cliente": "2241"
}
```

---

### Comodato `/cliente_contrato_comodato`

| Ação | Método | URL |
|---|---|---|
| Listar produtos | GET | `/cliente_contrato_comodato` |
| Listar patrimônios | GET | `/cliente_contrato_comodato` (filtrar por `id_patrimonio`) |
| Inserir produto | POST | `/cliente_contrato_comodato` — `{ "id_produto": "36" }` |
| Inserir patrimônio | POST | `/cliente_contrato_comodato` — `{ "id_patrimonio", "id_produto", "numero_patrimonial" }` |
| Editar | PUT | `/cliente_contrato_comodato/{id}` |
| Baixar produto | POST | `/baixar_comodato_23069` |
| Baixar patrimônio | POST | `/baixar_comodato_23069` |

---

### Termos `/cliente_contrato_assinatura_termo`

| Método | URL |
|---|---|
| GET | `/cliente_contrato_assinatura_termo` |
| POST | `/cliente_contrato_assinatura_termo` |
| PUT | `/cliente_contrato_assinatura_termo/{id}` |
| DELETE | `/cliente_contrato_assinatura_termo/{id}` |

**Campos obrigatórios (POST):**
```json
{
  "id_termo": "3",
  "assinado": "N",
  "id_cliente_contrato_modelo": "1",
  "id_contrato": "2298"
}
```

---

### Arquivos do Contrato `/cliente_arquivos`

| Método | URL | Filtro |
|---|---|---|
| GET | `/cliente_arquivos` | `qtype: cliente_arquivos.id_contrato` |
| POST | `/cliente_arquivos` | — |
| DELETE | `/cliente_arquivos/{id}` | — |

---

### Ramal SIP `/voip_sippeers`

| Método | URL |
|---|---|
| GET | `/voip_sippeers` (`qtype: voip_sippeers.id_contrato`) |

---

## Códigos de Erro

| Código | Causa |
|---|---|
| 400 | Erro SSL ou autenticação diferente de Basic Auth |
| 401 | Token inválido ou usuário inativo |
| 403 | Token gerado no servidor anterior (pós-migração) |
| 404 | Header `ixcsoft: listar` ausente em requisições GET |
| 500 | Endpoint incorreto ou campo sem prefixo de tabela no `qtype` |
| 504 | Timeout — limitação do servidor ou alta demanda |
