# EHR-FHIR-Vue-Express Demo Project

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This project demonstrates a full-stack application architecture combining a **Vue.js 3 (Composition API)** frontend, an **Express.js (TypeScript)** backend, **PostgreSQL** database, **TypeORM**, **JWT (with Refresh Token & HttpOnly Cookie)** authentication, and basic **HL7 FHIR** standard integration (via **HAPI FHIR Server**).

The entire environment is containerized using **Docker** and **Docker Compose**, ensuring consistency across development, testing, and deployment.

**Key Demonstrated Features:**

* Frontend-Backend separation architecture
* Database interaction using TypeORM (PostgreSQL)
* User registration and login
* Authentication mechanism using JWT Access Tokens and Refresh Tokens
    * Utilizes **HttpOnly Cookies** for storing tokens, enhancing security
    * Implements automatic Access Token refresh
* Patient data CRUD (Create, Read, Update, Delete) operations
* Conversion of internal patient data to **FHIR R5 Patient** resources
* Pushing converted FHIR resources to a HAPI FHIR server (manual trigger & automatic trigger after CRUD operations)
* Retrieving patient data in FHIR JSON format via API
* Complete Dockerized development environment

## System Architecture

This project includes the following main service components running within a Docker network:

```mermaid
graph TD
    subgraph "User's Browser"
        Frontend["Vue.js Frontend<br>(Runs on Host:8080)"]
    end

    subgraph "Docker Network (ehr-network)"
        Backend["Express.js Backend<br>(Service: ehr-backend, Container Port: 3333)"]
        EHR_DB["EHR PostgreSQL DB<br>(Service: ehr-postgres, Container Port: 5432)"]
        HAPI_FHIR["HAPI FHIR Server<br>(Service: fhir, Container Port: 8080)"]
        FHIR_DB["FHIR PostgreSQL DB<br>(Service: fhir-db, Container Port: 5432)"]
    end

    subgraph "Developer Host Machine"
         User[Developer/User]
         Docker --> Frontend_Host["Host Port 8080"]
         Docker --> Backend_Host["Host Port 3333"]
         Docker --> EHR_DB_Host["Host Port 5433"]
         Docker --> FHIR_DB_Host["Host Port 5434"]
         Docker --> HAPI_FHIR_Host["Host Port 8070"]
    end

    User -- HTTP --> Frontend_Host
    Frontend -- HTTP API (http://localhost:3333/api) --> Backend_Host

    %% Internal Docker Network Communication
    Backend -- "API Call (http://fhir:8080)" --> HAPI_FHIR
    Backend -- "SQL (ehr-postgres:5432)" --> EHR_DB
    HAPI_FHIR -- "SQL (fhir-db:5432)" --> FHIR_DB

    %% Host Port Mappings
    Frontend_Host -.-> Frontend
    Backend_Host -.-> Backend
    EHR_DB_Host -.-> EHR_DB
    FHIR_DB_Host -.-> FHIR_DB
    HAPI_FHIR_Host -.-> HAPI_FHIR

    %% Style
    style User fill:#f9f,stroke:#333,stroke-width:2px
    style Frontend fill:#42b883,stroke:#333,stroke-width:1px
    style Backend fill:#8cc84b,stroke:#333,stroke-width:1px
    style EHR_DB fill:#336791,stroke:#333,stroke-width:1px,color:#fff
    style FHIR_DB fill:#336791,stroke:#333,stroke-width:1px,color:#fff
    style HAPI_FHIR fill:#f48a4a,stroke:#333,stroke-width:1px
```

**Component Descriptions:**

* **Vue.js Frontend:** The user interface, responsible for displaying data, user interaction, and communicating with the backend via API. Runs on the host's port 8080.
* **Express.js Backend:** Provides RESTful APIs, handles business logic, authentication, database operations, and FHIR conversion/pushing. Runs on the host's port 3333.
* **EHR PostgreSQL DB:** The main application database, storing core data like `users` and `patients`. Accessible from the host on port 5433.
* **HAPI FHIR Server:** A standard open-source FHIR server for receiving and storing patient data in FHIR format. Its Web UI or API is accessible from the host on port 8070.
* **FHIR PostgreSQL DB:** A dedicated, separate database used exclusively by the HAPI FHIR Server. Accessible from the host on port 5434.
* **Docker Network:** Provides an isolated network environment for containers, allowing services to communicate with each other using their service names (e.g., backend can access `http://fhir:8080`).

## Technology Stack

* **Frontend:**
    * Vue 3 (Composition API)
    * TypeScript
    * Vite
    * Pinia (State Management)
    * Vue Router
    * Vuetify 3 (UI Component Library)
    * Axios (HTTP Client)
    * ESLint, Prettier
* **Backend:**
    * Node.js
    * Express.js
    * TypeScript
    * TypeORM (PostgreSQL Driver)
    * jsonwebtoken (JWT Handling)
    * bcrypt (Password Hashing)
    * class-validator, class-transformer (DTO Validation & Transformation)
    * cors, cookie-parser
    * ESLint, Prettier
* **Database:**
    * PostgreSQL (v17 Alpine)
* **FHIR Server:**
    * HAPI FHIR JPA Server (Docker Image)
* **Containerization:**
    * Docker
    * Docker Compose
* **Development Tools:**
    * Nodemon (Backend Hot-Reload)

## Project Structure

```
EHR-FHIR-Vue-Express/
├── backend/            # Express.js backend code
│   ├── src/            # Source code directory
│   │   ├── config/     # Configuration files (DB, JWT, etc.)
│   │   ├── controllers/ # Express controllers (handle requests)
│   │   ├── database/   # Database related (future migrations)
│   │   ├── dto/        # Data Transfer Objects (for validation)
│   │   ├── middleware/ # Express middleware (e.g., auth)
│   │   ├── models/     # Data models (TypeORM Entities)
│   │   ├── routes/     # Express route definitions
│   │   ├── services/   # Business logic layer
│   │   ├── utils/      # Utility functions (e.g., error handling)
│   │   ├── app.ts      # Express application setup
│   │   └── server.ts   # Server startup entry point
│   ├── Dockerfile      # Backend Dockerfile
│   ├── nodemon.json    # Nodemon configuration
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example    # Environment variable template <--- Needs copying to .env
├── database/           # SQL scripts
│   ├── mock_data.sql   # Sample data (optional)
│   ├── patients.sql    # patients table structure
│   └── users.sql       # users table structure
├── frontend/           # Vue.js frontend code
│   ├── src/            # Source code directory
│   │   ├── assets/     # Static assets (CSS, Images)
│   │   ├── components/ # Vue components
│   │   ├── plugins/    # Vue plugins (e.g., Vuetify)
│   │   ├── router/     # Vue Router configuration
│   │   ├── services/   # API service layer (apiClient, patientService)
│   │   ├── stores/     # Pinia Stores (state management)
│   │   ├── types/      # TypeScript type definitions
│   │   ├── views/      # Vue page-level components
│   │   ├── App.vue     # Root component
│   │   └── main.ts     # Frontend entry point
│   ├── Dockerfile      # Frontend Dockerfile (typically multi-stage)
│   ├── index.html      # HTML entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env.example    # Environment variable template <--- Needs copying to .env
├── docker-compose.yaml # Docker Compose configuration file
├── hapi.application.yaml # HAPI FHIR Server configuration file
└── README.md           # This file!
```

## Prerequisites

* **Docker:** [Install Docker](https://docs.docker.com/engine/install/)
* **Docker Compose:** Usually installed with Docker Desktop. If not, see [Install Docker Compose](https://docs.docker.com/compose/install/).
* **(Optional) Node.js & npm/yarn:** Required if you want to run the frontend or backend locally (outside Docker) for development/debugging. LTS version recommended.
* **(Optional) Git:** For cloning the project repository.

## Setup and Configuration

1.  **Clone the Project:**
    ```bash
    git clone <repository_url>
    cd EHR-FHIR-Vue-Express
    ```

2.  **Create Backend `.env` File:**
    * Copy the example file:
        ```bash
        cp backend/.env.example backend/.env
        ```
    * Edit `backend/.env` and fill in the necessary environment variables:
        ```dotenv
        # Node Environment (development or production)
        NODE_ENV=development

        # Backend Server Port
        PORT=3333

        # CORS Origin (URL of your frontend, use '*' for development if needed, but restrict in production)
        # Example for default Vite dev server:
        CORS_ORIGIN=http://localhost:8080
        # Example for production build served at root:
        # CORS_ORIGIN=[https://yourdomain.com](https://yourdomain.com)

        # Database Configuration (Points to the 'ehr-postgres' service in Docker)
        DB_TYPE=postgres
        DB_HOST=ehr-postgres # Use the service name from docker-compose.yaml
        DB_PORT=5432       # Internal port of the postgres container
        DB_USERNAME=ehr_user # Must match docker-compose.yaml
        DB_PASSWORD=ehr_password # Must match docker-compose.yaml - USE STRONG PASSWORD IN PRODUCTION & SECRETS
        DB_DATABASE=ehr_db   # Must match docker-compose.yaml

        # FHIR Server Configuration
        # Internal URL for the HAPI FHIR service within the Docker network
        FHIR_TARGET_SERVER_URL=http://fhir:8080

        # JWT Configuration
        # 1. Generate RSA Key Pair (e.g., using ssh-keygen or openssl):
        #    ssh-keygen -t rsa -b 4096 -m PEM -f jwtRS256.key
        #    openssl rsa -in jwtRS256.key -pubout -outform PEM -out jwtRS256.key.pub
        # 2. Copy the *content* of the private key file (jwtRS256.key) here, replacing newlines with \n.
        # 3. Copy the *content* of the public key file (jwtRS256.key.pub) here, replacing newlines with \n.
        JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
        JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
        JWT_ACCESS_TOKEN_EXPIRATION=15m # Access token lifetime (e.g., 15 minutes)
        JWT_REFRESH_TOKEN_EXPIRATION=7d # Refresh token lifetime (e.g., 7 days)
        # Optional: Issuer and Audience for JWT validation
        # JWT_ISSUER=your-app-issuer
        # JWT_AUDIENCE=your-app-audience

        # Cookie Configuration
        # A strong, random secret for signing non-HttpOnly cookies (if any) and potentially for session management.
        COOKIE_SECRET=your-very-strong-random-cookie-secret # Generate a strong random string
        # Optional: Set if you need cookies accessible across subdomains (e.g., ".yourdomain.com")
        # COOKIE_DOMAIN=
        ```
    * **IMPORTANT:**
        * **JWT Keys:** You MUST generate your own RSA key pair. Copy the content of your private key file (`jwtRS256.key`) into `JWT_PRIVATE_KEY` (replace newlines with `\n`, include headers/footers). Copy the content of your public key file (`jwtRS256.key.pub`) into `JWT_PUBLIC_KEY` (replace newlines with `\n`). **NEVER** use example keys in production or commit private keys to version control.
        * **Password/Key Security:** In production environments, use Docker Secrets or other secure configuration management tools for database passwords, JWT keys, and the Cookie Secret instead of placing them directly in the `.env` file.

3.  **Create Frontend `.env` File:**
    * Copy the example file:
        ```bash
        cp frontend/.env.example frontend/.env
        ```
    * Edit `frontend/.env` and set the backend API URL:
        ```dotenv
        # URL the frontend uses to reach the backend API *from the user's browser*
        VITE_API_BASE_URL=http://localhost:3333/api
        ```
    * **Note:** This URL must be accessible from the **user's browser**. In development, this is typically `http://localhost:BACKEND_HOST_PORT/api`.

4.  **HAPI FHIR Config (`hapi.application.yaml`):**
    * This file [cite: EHR-FHIR-Vue-Express/hapi.application.yaml] is pre-configured to connect to the `fhir-db` service defined in `docker-compose.yaml`. Usually, no changes are needed unless you want to modify the HAPI FHIR server's behavior.

5.  **Port Allocation:**
    * `docker-compose.yaml` [cite: EHR-FHIR-Vue-Express/docker-compose.yaml] defines mappings from container ports to host ports (`HOST:CONTAINER`).
    * Default Host Ports:
        * Frontend (Vue App): `8080`
        * Backend (Express API): `3333`
        * EHR Database (PostgreSQL): `5433` (for direct connection from host)
        * FHIR Database (PostgreSQL): `5434` (for direct connection from host)
        * HAPI FHIR Server: `8070` (for accessing HAPI UI/API)
    * **If these ports are already in use on your host machine**, modify the **HOST** part (the number before the colon) of the corresponding `ports` setting in `docker-compose.yaml`. For example, change the backend port mapping to `3334:3333`.

## Running the Application (Docker)

Using Docker Compose is the recommended way to run the entire application stack.

1.  **Start All Services:**
    * From the project root directory, run:
        ```bash
        docker-compose up --build -d
        ```
    * `--build`: Forces Docker to rebuild the images (needed on first run or after Dockerfile changes).
    * `-d`: Runs containers in the background (detached mode).

2.  **Initialize Database Schema:**
    * Because the backend is configured with `synchronize: true` (in development mode), TypeORM will automatically create or update tables in the `ehr-postgres` database based on `src/models/entities/*.entity.ts` when the backend container starts.
    * The HAPI FHIR server will automatically handle the schema for its `fhir-db` database.

3.  **(Optional) Import Mock Data:**
    * If you need initial data, you can execute the SQL script manually after the containers are running:
        ```bash
        # Find the ehr-postgres container ID
        docker ps
        # Execute SQL (assuming container ID is <container_id>)
        docker exec -i <container_id> psql -U ehr_user -d ehr_db < database/mock_data.sql
        ```
    * Alternatively, modify `docker-compose.yaml` to have the PostgreSQL container automatically run `*.sql` scripts on startup (see [PostgreSQL Docker Hub documentation](https://hub.docker.com/_/postgres) under "Initialization scripts").

4.  **View Service Logs:**
    * View logs for all services:
        ```bash
        docker-compose logs -f
        ```
    * View logs for a specific service (e.g., backend):
        ```bash
        docker-compose logs -f backend
        ```

5.  **Access Services:**
    * **Frontend Application:** [http://localhost:8080](http://localhost:8080)
    * **Backend Health Check:** [http://localhost:3333/api/health](http://localhost:3333/api/health)
    * **HAPI FHIR Web UI:** [http://localhost:8070](http://localhost:8070)

6.  **Stop All Services:**
    * ```bash
        docker-compose down
        ```
    * To also remove volumes (clearing all database data):
        ```bash
        docker-compose down -v
        ```

## Backend Schema Management

* **Development:** Currently uses `synchronize: true`, where TypeORM automatically syncs the schema. Convenient but risky, **not suitable for production**. If you encounter synchronization errors like `column ... contains null values`, it usually means existing data/schema in the volume conflicts with new Entity definitions. The quickest fix is often to clear the volume (`docker-compose down -v`) and restart (`docker-compose up --build`).
* **Production (Recommended):**
    1.  Set `synchronize: false` in `backend/src/config/dataSource.ts`.
    2.  Use the TypeORM CLI to manage schema changes:
        * Ensure `ts-node` and `typescript` are installed (`devDependencies`).
        * Configure the DataSource path for CLI commands in `backend/package.json`.
        * Generate Migration: `npx typeorm migration:generate ./src/database/migrations/YourChangeName`
        * Run Migrations: `npx typeorm migration:run -d ./src/config/dataSource.ts`
        * Revert Migration: `npx typeorm migration:revert -d ./src/config/dataSource.ts`

## Login / Authentication Flow (Mermaid)

```mermaid
sequenceDiagram
    participant Client as Vue.js Frontend
    participant Server as Express.js Backend
    participant AuthSvc as AuthService
    participant UserDB as EHR PostgreSQL DB

    Client->>Server: POST /api/auth/login (email, password)
    Server->>AuthSvc: validateUser(email, password)
    AuthSvc->>UserDB: Find user by email
    UserDB-->>AuthSvc: User record (with hashed password)
    AuthSvc-->>AuthSvc: bcrypt.compare(password, hash)
    alt Credentials Valid
        AuthSvc->>Server: Return UserEntity
        Server->>AuthSvc: login(UserEntity)
        AuthSvc->>AuthSvc: generateAccessToken()
        AuthSvc->>AuthSvc: generateAndSaveRefreshToken(UserEntity)
        AuthSvc->>UserDB: Update user with refreshToken & expiry
        UserDB-->>AuthSvc: Update confirmation
        AuthSvc-->>Server: { accessToken, refreshToken, user }
        Server-->>Client: 200 OK (Set-Cookie: accessToken[HttpOnly], Set-Cookie: refreshToken[HttpOnly], Body: user data)
    else Credentials Invalid
        AuthSvc->>Server: Return null
        Server-->>Client: 401 Unauthorized
    end
```

## Token Refresh Flow (Mermaid)

```mermaid
sequenceDiagram
    participant Client as Vue.js Frontend (apiClient)
    participant Server as Express.js Backend
    participant AuthSvc as AuthService
    participant UserDB as EHR PostgreSQL DB

    Client->>Server: GET /api/patients (Cookie: accessToken [Expired])
    Server->>Server: authMiddleware verifies accessToken
    Server-->>Client: 401 Unauthorized (Token Expired)

    Client->>Client: Interceptor catches 401
    Client->>Server: POST /api/auth/refresh (Cookie: refreshToken [Valid])
    Server->>AuthSvc: validateRefreshToken(refreshToken)
    AuthSvc->>UserDB: Find user by ID from token payload
    UserDB-->>AuthSvc: User record (with stored refreshToken)
    AuthSvc-->>AuthSvc: Compare received token with stored token & check expiry
    alt Refresh Token Valid
        AuthSvc->>Server: Return UserEntity
        Server->>AuthSvc: generateAccessToken(payload)
        AuthSvc-->>Server: newAccessToken
        Server-->>Client: 200 OK (Set-Cookie: accessToken [New, HttpOnly])
        Client->>Client: Interceptor receives success, retries original request
        Client->>Server: GET /api/patients (Cookie: accessToken [New])
        Server->>Server: authMiddleware verifies accessToken
        Server-->>Client: 200 OK (Patient Data)
    else Refresh Token Invalid/Expired
        AuthSvc->>Server: Return null
        Server-->>Client: 403 Forbidden
        Client->>Client: Interceptor catches refresh error
        Client->>Client: Calls authStore.logoutAction()
        Client->>Client: Clears local state, redirects to '/' (Homepage)
    end

```

## FHIR Push Flow (Mermaid - Manual Trigger Example)

```mermaid
sequenceDiagram
    participant Client as Vue.js Frontend
    participant Server as Express.js Backend
    participant PatientSvc as PatientService
    participant FhirSvc as FhirService
    participant EHR_DB as EHR PostgreSQL DB
    participant FHIR_Server as HAPI FHIR Server

    Client->>Server: POST /api/patients/:id/push-to-fhir
    Server->>FhirSvc: triggerPushForPatient(id)
    FhirSvc->>PatientSvc: findById(id)
    PatientSvc->>EHR_DB: SELECT * FROM patients WHERE id = :id
    EHR_DB-->>PatientSvc: PatientEntity
    PatientSvc-->>FhirSvc: PatientEntity
    FhirSvc->>FhirSvc: convertDbPatientToFhir(PatientEntity)
    FhirSvc-->>FhirSvc: FHIR Patient Resource
    FhirSvc->>FHIR_Server: PUT /Patient/[pid] (FHIR Resource)
    FHIR_Server-->>FhirSvc: HTTP 200 OK / 201 Created (or error)
    alt Push Successful
        FhirSvc-->>Server: return true
        Server-->>Client: 200 OK { message: "Success..." }
    else Push Failed
        FhirSvc-->>Server: return false (or throws error)
        Server-->>Client: 500 Internal Server Error (or other relevant error)
    end
```

## Troubleshooting

* **Port Conflicts:** If `docker-compose up` fails mentioning `bind: address already in use`, modify the host port (before the colon) in the `ports` section of the relevant service in `docker-compose.yaml`.
* **DB Connection Errors:** Check `backend/.env` to ensure `DB_HOST` (should be service name `ehr-postgres`), `DB_PORT` (should be `5432`), `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE` match the `environment` settings in `docker-compose.yaml`.
* **Backend `synchronize` Errors:** If you encounter errors like `column ... contains null values` in development, it's often due to old data/schema in the volume conflicting with Entity definitions. The quickest fix is often to clear the volume (`docker-compose down -v`) and restart (`docker-compose up --build`). Alternatively, disable `synchronize` and use Migrations.
* **Frontend API Errors (CORS):** Ensure `CORS_ORIGIN` in `backend/.env` correctly allows the origin URL of your frontend (e.g., `http://localhost:8080`).
* **Frontend API Errors (401/403):** Verify browser cookies (ensure they are being set, HttpOnly flag), check JWT key configuration in `backend/.env` (ensure they match), and check for token expiration.
* **Docker Networking:** If services cannot communicate (e.g., backend can't reach FHIR server), ensure they are on the same Docker network (`ehr-network`) and use service names as hostnames (e.g., `http://fhir:8080`).

## License

[MIT](LICENSE)
