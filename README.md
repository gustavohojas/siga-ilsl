# SIGA-ILSL - Sistema Integrado de Gestão de Almoxarifado

Sistema web para controle de estoque, empenhos, recebimentos (NE e Doação), dispensações e relatórios com exportação para Excel.

---

## 🚀 Arquitetura e Tecnologias

- **Backend**: Node.js 20 (Express, pg, bcryptjs, jsonwebtoken, exceljs)
- **Frontend**: HTML5, CSS3 moderno, Vanilla JavaScript modular
- **Banco de Dados**: PostgreSQL 16 (Alpine)
- **Containerização**: Docker & Docker Compose

---

## 📦 Como Subir o Sistema no Servidor (Deploy)

### Pré-requisitos
- **Docker** e **Docker Compose** instalados no servidor.

### 1. Clonar o repositório
```bash
git clone <URL_DO_REPOSITORIO>
cd <PASTA_DO_REPOSITORIO>
```

### 2. Configurar variáveis de ambiente
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```
*(Se necessário, ajuste senhas ou portas no arquivo `.env` e no `docker-compose.yml`)*

### 3. Iniciar os contêineres
Execute o comando:
```bash
docker compose up -d --build
```

O Docker iniciará:
1. `siga-ilsl-db`: Banco de dados PostgreSQL 16 Alpine com healthcheck ativo.
2. `siga-ilsl-app`: Aplicação Node.js exposta na porta `3000`.

As migrações do schema e as cargas iniciais (Admin e Centros Consumidores com trava de segurança de execução única) são executadas automaticamente na inicialização da aplicação.

---

## 🔑 Credenciais Padrão de Primeiro Acesso

- **URL de Acesso**: `http://<IP_DO_SERVIDOR>:3000`
- **Usuário**: CPF `40169736865`
- **Senha Inicial**: `ILSL2026`

*(Recomenda-se alterar a senha após o primeiro acesso pelo menu de Usuários).*

---

## ⚙️ Portas e Serviços

| Serviço | Porta Contêiner | Porta Host Padrão | Descrição |
|---|---|---|---|
| Web App | `3000` | `3000` | Interface web e APIs REST |
| PostgreSQL | `5432` | `5433` | Banco de dados PostgreSQL (porta mapeada para 5433 para não conflitar com outros bancos locais) |

---

## 🛠️ Comandos Úteis para Manutenção

- **Verificar status dos contêineres**:
  ```bash
  docker compose ps
  ```

- **Ver logs da aplicação**:
  ```bash
  docker compose logs -f app
  ```

- **Reiniciar os serviços**:
  ```bash
  docker compose restart
  ```

- **Parar os serviços**:
  ```bash
  docker compose down
  ```
