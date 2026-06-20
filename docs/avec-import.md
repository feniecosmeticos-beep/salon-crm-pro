# Salon CRM Pro — Importação AVEC

> Última revisão: 19 de junho de 2026  
> Fonte: implementação em `src/features/imports`.

## Visão geral

O fluxo de importação lê relatórios AVEC em Excel, converte cabeçalhos conhecidos para o modelo interno, normaliza valores, separa linhas válidas e inválidas e persiste apenas as linhas válidas no Supabase.

Formato aceito pela interface:

- `.xlsx`
- MIME esperado: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

Regras gerais de leitura:

- somente a primeira planilha do arquivo é processada;
- a primeira linha não vazia é usada como cabeçalho;
- linhas totalmente vazias são ignoradas;
- células vazias viram string vazia durante a leitura;
- a prévia mostra no máximo 50 linhas;
- a validação considera todas as linhas não vazias e a persistência recebe somente as linhas válidas;
- arquivos vazios, sem planilha ou ilegíveis retornam erro de arquivo inválido.

## Tipos de arquivos suportados

| Tipo na interface | Identificador interno | Destino principal |
| --- | --- | --- |
| Clientes | `clients` | `clients` |
| Clientes atendidos | `attended_clients` | `clients` e `client_metrics` |
| Serviços realizados | `appointments` | `clients`, `professionals`, `services`, `appointments` |
| Tabela de serviços | `services` | `services` |
| Produtos vendidos | `product_sales` | `clients` e `product_sales` |

## Colunas esperadas

Os cabeçalhos são comparados sem acentos, sem pontuação e sem diferença entre maiúsculas e minúsculas. Por exemplo, `E-mail`, `email` e `EMAIL` podem corresponder ao mesmo alias quando previstos no mapeador.

### Clientes

| Campo normalizado | Cabeçalhos aceitos | Obrigatório |
| --- | --- | --- |
| `avec_code` | `Código`, `Codigo`, `Cód.`, `Cod.` | Não |
| `name` | `Nome`, `Cliente`, `Nome do cliente` | Sim |
| `birth_date` | `Aniversário`, `Aniversario`, `Data de nascimento` | Não |
| `phone` | `Telefone`, `Fone` | Não |
| `mobile` | `Celular`, `Telefone celular`, `WhatsApp` | Não |
| `email` | `E-mail`, `Email` | Não |
| `gender` | `Sexo`, `Gênero`, `Genero` | Não |
| `address` | `Endereço`, `Endereco`, `Logradouro` | Não |
| `city` | `Cidade`, `Município`, `Municipio` | Não |
| `district` | `Bairro`, `Distrito` | Não |
| `registration_date` | `Data de cadastro`, `Cadastro`, `Data cadastro` | Não |
| `notes` | `Observações`, `Observacoes`, `Obs.` | Não |

### Clientes atendidos

| Campo normalizado | Cabeçalhos aceitos | Obrigatório |
| --- | --- | --- |
| `client_name` | `Cliente`, `Nome`, `Nome do cliente` | Sim |
| `mobile` | `Celular`, `Telefone celular`, `WhatsApp` | Não |
| `email` | `E-mail`, `Email` | Não |
| `last_visit` | `Última visita`, `Ultima visita`, `Data da última visita` | Não |
| `total_spent` | `Total consumido`, `Valor consumido`, `Total gasto` | Não |
| `professionals` | `Profissionais`, `Profissional`, `Equipe` | Não |
| `total_visits` | `Número de visitas`, `Numero de visitas`, `Visitas` | Não |

Observação: `professionals` é normalizado e exibido na prévia, mas não é persistido pelo handler atual.

### Serviços realizados

| Campo normalizado | Cabeçalhos aceitos | Obrigatório |
| --- | --- | --- |
| `professional_name` | `Profissional`, `Profissionais` | Não |
| `appointment_date` | `Data da comanda`, `Data`, `Data atendimento` | Sim |
| `service_name` | `Serviço`, `Servico`, `Procedimento` | Sim |
| `category` | `Categoria`, `Grupo` | Não |
| `client_name` | `Cliente`, `Nome`, `Nome do cliente` | Sim |
| `mobile` | `Celular`, `Telefone celular`, `WhatsApp` | Não |
| `gross_value` | `Valor`, `Valor bruto` | Não |
| `discount_value` | `Desconto`, `Valor desconto` | Não |
| `total_value` | `Total`, `Valor total` | Não |

Se `total_value` não estiver presente:

1. tenta calcular `gross_value - discount_value`;
2. se não for possível, usa `gross_value`;
3. na persistência, valores ainda ausentes caem para zero.

### Tabela de serviços

| Campo normalizado | Cabeçalhos aceitos | Obrigatório |
| --- | --- | --- |
| `name` | `Serviço`, `Servico`, `Nome`, `Procedimento` | Sim |
| `category` | `Categoria`, `Grupo` | Não |
| `standard_price` | `Valor`, `Preço`, `Preco` | Não |

### Produtos vendidos

| Campo normalizado | Cabeçalhos aceitos | Obrigatório |
| --- | --- | --- |
| `client_name` | `Cliente`, `Nome`, `Nome do cliente` | Sim |
| `product_name` | `Produto`, `Item`, `Nome do produto` | Sim |
| `brand` | `Marca`, `Fabricante` | Não |
| `category` | `Categoria`, `Grupo` | Não |
| `sale_date` | `Data`, `Data da venda`, `Data venda`, `Venda` | Não |
| `unit_value` | `Valor`, `Valor unitário` | Não |
| `quantity` | `Quantidade`, `Qtd.`, `Qtd` | Não |
| `total_value` | `Total`, `Valor total` | Não |

Regras:

- quantidade ausente recebe `1`;
- total ausente é calculado por `unit_value × quantity`;
- na persistência, valores ainda ausentes caem para zero.

## Normalizações

### Cabeçalhos

Para localizar uma coluna:

1. remove acentos;
2. converte para minúsculas;
3. remove tudo que não seja letra ou número.

### Texto

- converte para string;
- remove espaços no início e no fim;
- reduz sequências de espaços internos a um espaço;
- valor vazio vira `null`.

### Telefone

- aplica normalização de texto;
- remove todos os caracteres não numéricos;
- armazena somente dígitos;
- não valida DDD, país ou quantidade de dígitos.

### E-mail

- remove espaços externos;
- converte para minúsculas;
- não valida o formato do endereço.

### Datas

Formatos tratados:

- objeto `Date` vindo do XLSX;
- número serial do Excel;
- `dd/mm/aaaa`;
- `dd-mm-aaaa`;
- `dd.mm.aaaa`;
- ano com dois dígitos;
- prefixo ISO `aaaa-mm-dd`;
- fallback do parser nativo de `Date`.

Saída:

- string ISO `aaaa-mm-dd`;
- datas impossíveis viram `null`;
- anos de `00` a `69` são interpretados como 2000–2069;
- anos de `70` a `99` são interpretados como 1970–1999.

### Moeda e números

- remove símbolos e texto não numérico;
- entende vírgula ou ponto como separador decimal;
- quando ambos existem, o último separador é tratado como decimal;
- retorna `number`;
- valores não interpretáveis viram `null`.

## Validações

A validação atual verifica somente a presença dos campos obrigatórios de cada tipo.

| Tipo | Campos obrigatórios |
| --- | --- |
| Clientes | `name` |
| Clientes atendidos | `client_name` |
| Serviços realizados | `client_name`, `service_name`, `appointment_date` |
| Tabela de serviços | `name` |
| Produtos vendidos | `client_name`, `product_name` |

Mensagem gerada:

```text
Campo obrigatório ausente: <campo>.
```

Não são validados atualmente:

- formato real do e-mail;
- tamanho ou validade do telefone;
- CPF;
- valores negativos;
- quantidade positiva;
- duplicidade dentro da própria planilha;
- coerência entre bruto, desconto e total;
- datas futuras ou antigas demais;
- existência do salão;
- tipo de importação em uma lista permitida no endpoint;
- estrutura das linhas novamente no servidor.

## Processo de importação

### 1. Seleção

O usuário seleciona um dos cinco tipos e escolhe um arquivo `.xlsx`.

### 2. Processamento da prévia

O browser executa em paralelo:

- `readExcelFile`: lê cabeçalhos e linhas para a prévia;
- `parseAvecExcel`: lê novamente o arquivo, mapeia, normaliza e valida.

### 3. Resultado local

A tela apresenta:

- arquivo e tipo selecionados;
- total de linhas;
- total de válidas;
- total de inválidas;
- dados normalizados;
- erros por linha;
- até 50 linhas na tabela de prévia.

### 4. Envio

Ao continuar:

- somente `result.validRows` é enviado;
- o payload contém somente `type`, `fileName` e `rows`;
- o browser não escolhe nem envia `salon_id`;
- o servidor resolve o salão pela sessão autenticada e por `public.users.salon_id`;
- o destino é `POST /api/imports/avec`.

### 5. Validação da API

O endpoint verifica:

- corpo JSON válido;
- tipo presente na lista oficial dos cinco formatos;
- nome de arquivo `.xlsx`, não vazio e com até 255 caracteres;
- lista com 1 a 20.000 linhas;
- índice positivo por linha;
- objetos `raw` e `normalized`;
- campos obrigatórios novamente no servidor.

Os erros enviados pelo browser são descartados e a validação é refeita. O endpoint exige sessão, salão vinculado e a permissão `import_avec`, disponível para `admin` e `gerente`.

### 6. Persistência

As linhas são processadas sequencialmente. Cada linha possui seu próprio `try/catch`.

Consequências:

- uma falha não interrompe as próximas linhas;
- não existe transação global;
- uma importação pode terminar parcialmente gravada;
- o resultado guarda erros por número de linha.

## Regras de persistência por tipo

### Clientes

Procura cliente existente, sempre dentro do salão, nesta ordem:

1. `avec_code`;
2. `mobile`;
3. `email`;
4. `name`.

Se encontrar:

- atualiza o registro.

Se não encontrar:

- cria um cliente.

Comparações são exatas após a normalização. Nomes e e-mails não usam busca case-insensitive no banco; o e-mail já chega em minúsculas, mas o nome preserva a capitalização original.

### Clientes atendidos

Procura ou cria o cliente usando:

1. celular;
2. e-mail;
3. nome.

Depois grava métricas agregadas:

- última visita;
- total de visitas;
- gasto total como gasto em serviços;
- ticket médio;
- status;
- nível;
- dias sem visita;
- `buys_products = false`.

Após todas as linhas, o recalculo geral é executado para todos os clientes do salão.

### Tabela de serviços

Procura o serviço por:

```text
salon_id + name
```

Se encontrar, atualiza nome, categoria, preço padrão e `active = true`. Caso contrário, cria.

### Serviços realizados

Para cada linha:

1. procura ou cria o cliente por celular e nome;
2. procura ou cria o profissional por nome exato, se informado;
3. procura ou cria o serviço por nome exato;
4. procura um atendimento existente pela assinatura;
5. atualiza o atendimento encontrado ou cria um novo;
6. grava `import_source = avec`.

Assinatura de deduplicação:

```text
salon_id
+ client_id
+ service_id
+ appointment_date
+ total_value
+ professional_id
```

### Produtos vendidos

Para cada linha:

1. procura ou cria o cliente somente pelo nome;
2. procura uma venda existente pela assinatura;
3. atualiza a venda encontrada ou cria uma nova.

Assinatura de deduplicação:

```text
salon_id
+ client_id
+ product_name
+ sale_date
+ total_value
```

## Persistência relacionada

### Criação automática de cadastros

Importações de atendimentos podem criar automaticamente:

- cliente;
- profissional;
- serviço.

Importações de produtos podem criar automaticamente o cliente.

### Deduplicação

A deduplicação acontece em consultas antes do insert/update. Não há constraints equivalentes no banco.

Se já existirem múltiplos registros para um critério consultado com `maybeSingle()`, a operação pode falhar.

### Atualizações parciais

Updates preservam o valor já armazenado quando a planilha não fornece um valor útil.

Regras atuais:

- `null`, `undefined` e texto vazio são removidos dos payloads de update;
- e-mail e celular ausentes não apagam o cadastro do cliente;
- categoria e preço ausentes não zeram serviços existentes;
- marca, categoria, data e valores ausentes não apagam vendas encontradas;
- quantidade ausente usa `1` em novos registros, mas não substitui a quantidade de uma venda existente;
- valores financeiros ausentes não zeram atendimentos encontrados;
- inserts novos continuam usando os defaults previstos pelo schema.

Os campos obrigatórios e os valores efetivamente presentes na planilha continuam podendo atualizar o registro.

## Recalculo de métricas

O recalculo é executado após importações dos tipos:

- `clients`;
- `attended_clients`;
- `appointments`;
- `product_sales`.

Não é executado após `services`.

### Escopo

O processo consulta todos os clientes do salão e recalcula um por um.

Para cada cliente, lê:

- atendimentos;
- vendas de produtos;
- métricas anteriores.

### Fórmulas

```text
visitCount = quantidade de atendimentos no banco
totalProductSpent = soma de product_sales.total_value
totalVisits = maior valor entre visitCount e total_visits anterior
totalServiceSpent = maior valor entre a soma dos atendimentos e o valor anterior
totalSpent = totalServiceSpent + totalProductSpent
averageTicket = totalSpent / totalVisits, quando totalVisits > 0
lastVisit = data mais recente entre appointments e last_visit anterior
buysProducts = totalProductSpent > 0
```

### Status

| Regra | Resultado |
| --- | --- |
| sem última visita ou zero visitas | `Sem histórico` |
| exatamente uma visita e até 30 dias | `Novo` |
| até 45 dias | `Ativo` |
| de 46 a 89 dias | `Em risco` |
| 90 dias ou mais | `Inativo` |

### Nível

| Regra | Resultado |
| --- | --- |
| gasto `>= 3000` ou visitas `> 15` | `Diamante` |
| gasto `>= 1500` ou visitas `> 10` | `Ouro` |
| gasto `>= 700` ou visitas `> 5` | `Prata` |
| demais casos | `Bronze` |

Pontos de atenção:

- o ticket médio inclui gastos com produtos e serviços;
- `days_without_visit` é persistido no recalculo e atualizado em memória nas leituras principais;
- totais agregados anteriores são preservados quando a base detalhada ainda está incompleta.

As definições oficiais estão em [client-metrics-rules.md](./client-metrics-rules.md).

## Log da importação

Depois do processamento, é criado um registro em `imports` com:

- salão;
- tipo;
- nome do arquivo;
- total de linhas enviadas ao servidor;
- linhas importadas;
- linhas com falha de persistência;
- status;
- data automática.

Status possíveis no fluxo:

- `completed`;
- `completed_with_errors`;
- `failed`.

Importante:

- linhas inválidas encontradas no browser não são enviadas;
- por isso, elas não entram em `total_rows` ou `failed_rows` do log;
- uma falha apenas no recalculo ou no próprio log pode produzir `completed_with_errors` sem aumentar `failed_rows`;
- se a gravação do log falhar, o resultado ainda retorna para a tela com um erro geral.

## Limitações e riscos atuais

1. Somente `.xlsx` é aceito.
2. Somente a primeira planilha é processada.
3. O endpoint usa service role após validar sessão, permissão e tenant no servidor.
4. A service role ignora RLS e exige manutenção cuidadosa dessas validações explícitas.
5. Não há transação global.
6. A deduplicação não é garantida por constraints.
7. A correspondência por nome pode unir pessoas diferentes.
8. A importação de produtos usa somente o nome para localizar o cliente.
9. A coluna `professionals` de clientes atendidos não é persistida.
10. O recalculo percorre todos os clientes do salão após cada importação relevante.
11. Não há histórico detalhado dos erros no banco, apenas o resumo do log.
12. O resumo de `imports` ainda não possui tela própria; a auditoria recente aparece apenas para administradores em Configurações.

## Arquivos responsáveis

- Tipos: [`src/features/imports/types/avec-import.types.ts`](../src/features/imports/types/avec-import.types.ts)
- Leitura: [`src/features/imports/lib/excel-reader.ts`](../src/features/imports/lib/excel-reader.ts)
- Mapeamento: [`src/features/imports/lib/avec-mappers.ts`](../src/features/imports/lib/avec-mappers.ts)
- Normalização: [`src/features/imports/lib/normalizers.ts`](../src/features/imports/lib/normalizers.ts)
- Validação: [`src/features/imports/lib/validators.ts`](../src/features/imports/lib/validators.ts)
- Cliente de persistência: [`src/features/imports/lib/avec-import-persister.ts`](../src/features/imports/lib/avec-import-persister.ts)
- Persistência servidor: [`src/features/imports/lib/avec-import-persistence-core.ts`](../src/features/imports/lib/avec-import-persistence-core.ts)
- Endpoint: [`src/app/api/imports/avec/route.ts`](../src/app/api/imports/avec/route.ts)
