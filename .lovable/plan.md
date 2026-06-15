# Plano — Sistema de Controle de Endereçamento (SCE)

## Objetivo
Construir um sistema operacional para transformar a planta de um armazém em um mapa de endereçamento: calibrar medidas, delimitar áreas e entradas, cadastrar estruturas, gerar um layout focado em **maior capacidade**, atribuir SKUs e exportar a planilha de endereços.

## Fluxo principal
```text
Planta → Calibração → Compartimento e entradas → Regras de segurança
       → Corredores → Prateleiras e níveis → Layout sugerido
       → Endereçamento de SKUs → Planilha
```

## Implementação

### 1. Acesso e estrutura da empresa
- Login por e-mail e senha para os usuários da mesma empresa.
- Sem tabela adicional de perfis, conforme definido.
- Todos os dados ficam privados e acessíveis apenas a usuários autenticados da empresa.

### 2. Planta e calibração
- Upload de planta em imagem ou PDF.
- Marcação de dois pontos sobre a planta e informação da distância real em metros.
- Cálculo automático de pixels por metro, dimensões e área aproximada.
- Ferramentas para zoom, deslocamento, desfazer e redefinir calibração.

### 3. Delimitação física
- Desenho de um ou mais compartimentos do armazém sobre a planta.
- Exibição das dimensões reais durante o desenho.
- Marcação de uma ou várias entradas.
- Marcação de áreas de segurança e zonas proibidas.
- Configuração da largura mínima dos corredores.

### 4. Estruturas de armazenagem
- Cadastro de corredores com código e nome.
- Cadastro de prateleiras com código, corredor, dimensões, capacidade e número de níveis.
- Geração dos endereços por corredor, prateleira, nível e posição.
- Mapa interativo com seleção, edição e exclusão dos elementos.

### 5. Layout otimizado
- Geração de uma sugestão geométrica priorizando **maior capacidade**.
- Respeito aos limites do compartimento, entradas, áreas de segurança e largura mínima dos corredores.
- Comparativo entre capacidade estimada, área ocupada e quantidade de posições.
- Aplicação da sugestão ao mapa somente após confirmação do usuário.

### 6. SKUs e endereçamento
- Cadastro e busca de SKUs.
- Atribuição de cada SKU a um endereço disponível.
- Validação contra endereço duplicado ou inexistente.
- Consulta visual no mapa para localizar o endereço de um SKU.

### 7. Planilha
- Tela em formato de planilha com o endereço completo: armazém, corredor, prateleira, nível e posição.
- Filtros, busca e edição rápida.
- Exportação para Excel e CSV.

### 8. Interface
- Manter a direção visual escura das referências, mas com melhor legibilidade, hierarquia e aproveitamento da tela.
- Navegação por etapas com status: Planta, Áreas, Estruturas, Layout e Endereçamento.
- Layout responsivo, com prioridade para uso em desktop e suporte funcional em tablet.

## Base de dados e arquivos
- Armazéns, plantas, calibrações, compartimentos, entradas, áreas de segurança, corredores, prateleiras, níveis, posições, SKUs e atribuições.
- Regras de acesso privadas para usuários autenticados da empresa.
- Armazenamento seguro das plantas enviadas.

## Validação
- Testar calibração e conversão pixel/metro.
- Testar desenho e limites físicos do mapa.
- Testar geração do layout sem sobreposição com entradas e áreas de segurança.
- Testar criação única dos endereços e atribuição de SKUs.
- Testar exportações Excel/CSV e os principais fluxos em desktop e tablet.

## Infraestrutura já preparada
O Lovable Cloud foi ativado para fornecer banco de dados, armazenamento seguro das plantas, login de usuários e funções de servidor para cálculos e exportações.

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/features/cloud">Ler documentação do Cloud</presentation-link>
</presentation-actions>