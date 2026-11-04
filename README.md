# Conciliación Bancaria

Aplicativo web de **conciliación bancaria** para registrar los movimientos de bancos y caja con la misma lógica del Excel que usan hoy las áreas contables, pero más rápido, validado y sin duplicados.

> Objetivo: **digitalizar el Excel "MODELO DE CONCILIACIÓN BANCOS"** para capturar datos en menos tiempo. La hoja de captura del sistema respeta las columnas del Excel; lo que el contador ya sabe (proveedor, detalle, cuenta, medio de pago, tipo de cambio) lo completa el sistema.

| | |
|---|---|
| **Backend** | NestJS + Prisma (monolito modular) |
| **Frontend** | Next.js (App Router) + shadcn/ui + Tailwind CSS |
| **Base de datos** | PostgreSQL |
| **Monorepo** | pnpm workspaces (`apps/api`, `apps/web`, `packages/contracts`) |
| **Estado** | Fases 1 a 6 implementadas: sesión, usuarios, plan contable con amarres, catálogos SUNAT, cuentas de tesorería, Registro rápido, Libro de movimientos (edición, anulación y exportación a Excel), proveedores, plantillas de atajos, importación del Excel histórico, saldos por cuenta y cierre de meses. |

---

## Índice

1. [Documentos de origen](#1-documentos-de-origen)
2. [Cómo trabajan hoy (análisis del Excel)](#2-cómo-trabajan-hoy-análisis-del-excel)
3. [Problemas detectados en el Excel](#3-problemas-detectados-en-el-excel)
4. [Qué propone el sistema](#4-qué-propone-el-sistema)
5. [Arquitectura](#5-arquitectura)
6. [Modelo de datos](#6-modelo-de-datos)
7. [Reglas de negocio](#7-reglas-de-negocio)
8. [Flujos principales](#8-flujos-principales)
9. [Módulos y pantallas](#9-módulos-y-pantallas)
10. [API](#10-api)
11. [Estructura del repositorio](#11-estructura-del-repositorio)
12. [Instalación y desarrollo](#12-instalación-y-desarrollo)
13. [Migración del Excel histórico](#13-migración-del-excel-histórico)
14. [Hoja de ruta](#14-hoja-de-ruta)
15. [Decisiones pendientes](#15-decisiones-pendientes)
16. [Convenciones](#16-convenciones)

---

## 1. Documentos de origen

El material de referencia vive en [`public/documentos/`](public/documentos/).

| Archivo | Qué es |
|---|---|
| `MODELO DE CONCILIACION BANCOS  2026.xlsx` | Libro real con el que registran hoy los movimientos de enero a junio de 2026. Es la **fuente de verdad del proceso**. |
| `PLAN CONTABLE.xlsx` | Plan Contable General Empresarial de referencia (1 897 cuentas). |

---

## 2. Cómo trabajan hoy (análisis del Excel)

### 2.1 Hojas del libro

El libro tiene 12 hojas, pero solo **4 están visibles y en uso**:

| Hoja | Uso | Moneda | Filas 2026 | Cuenta contable de la caja/banco |
|---|---|---|---|---|
| `CTA CTE SOLES` | Cuenta corriente bancaria en soles | S/ | 704 | 1041 |
| `CTA CTE DOLARES $` | Cuenta corriente bancaria en dólares | US$ | 101 con datos | 1041 |
| `EFECTIVO` | Caja chica | S/ | 318 | 1011 |
| `TC` | Tipo de cambio diario compra/venta desde 2021-09-01 | — | 3 020 | — |

Hojas ocultas (heredadas de otros años, con datos de prueba o errores `#REF!`): `educacion`, `darwin`, `darwin B`, `CTA CTE INNOVATE`, `TURISMO EMPRENDE`, `DML`, `Hoja1`, `Hoja2`. Indican que **en el pasado hubo más cuentas**, por eso el sistema debe permitir crear cuentas nuevas sin tocar código.

### 2.2 Columnas de una hoja de cuenta

```text
Nº/Cheque/Operación | N# Voucher | Fecha Operación | Analítico | Ruc | Razón social | Detalle | T.C | Ingreso | Egreso | CTA | COD | (destino debe) | (destino haber)
```

| Columna | Significado | Ejemplo real |
|---|---|---|
| Nº/Cheque/Operación | Número de operación bancaria o cheque. Casi siempre vacío. | — |
| N# Voucher | `MM-NNNNN`: mes + correlativo. | `01-00021` |
| Fecha Operación | Fecha del movimiento. | 05/01/2026 |
| Analítico | Comprobante que sustenta el movimiento: `tipo-serie-número`. | `01-FB25-25390113`, `03-EB01-516`, `DJ-001-2026`, `--` |
| Ruc | RUC (11), DNI (8) o documento extranjero. | `20100130204` |
| Razón social | Nombre del proveedor/cliente. Se trae del RUC. | BANCO BBVA PERU |
| Detalle | Glosa del movimiento. | ITF, MANTENIMIENTO, VENTA DE MANGOTE DE CAUCHO |
| T.C | Tipo de cambio. `1` en soles; el del día en dólares. | `3.368` |
| Ingreso / Egreso | Importe. Solo uno de los dos tiene valor. | `0` / `6083` |
| CTA | Cuenta contable de contrapartida (plan contable). | `40181` |
| COD | Medio de pago, **Tabla 1 de SUNAT**. | `999`, `003`, `001`, `009` |
| Destino debe/haber | Solo en cuentas de gasto de clase 6: amarre a clase 9 y 79. | `95` / `791` |

La hoja de dólares agrega `TOTAL` (`=I+J`), `DEBE`/`HABER` y una columna de conversión (`=I/H`). También usa columnas libres para notas de pendientes (`SIN BOLETA AUN`, `ANTICIPO`, `PEND EMT BL`).

### 2.3 Lo que revelan los datos

- **Cada mes es un bloque.** Se repite la fila de encabezado al empezar el mes (soles: filas 2, 84, 212, 319, 467, 586…).
- **El correlativo del voucher es por mes y compartido entre las cuentas.** En enero: dólares `01-00001…00015`, soles `01-00016…00093`, efectivo `01-00094…00150`. Lo mismo ocurre en febrero, marzo, abril, mayo y junio. Hay saltos (por ejemplo `02-00148` no existe).
- **Un voucher puede tener varias líneas** (asiento compuesto). Ejemplo: `01-00053` agrupa en una misma fecha y proveedor (SUNAT) la renta de cuarta, la renta de quinta, ESSALUD y SNP con cuentas distintas.
- **Movimientos más frecuentes en soles:** ITF (CTA 40181, 286 filas), ventas (12121, 202), proveedores (42121, 69), sueldos (4111, 25).
- **Efectivo** es casi todo gasto: proveedores (42121) y declaraciones juradas de viáticos (6593 con destino 95/791).
- **Medios de pago usados:** `001` depósito, `003` transferencia, `009` efectivo demás casos, `999` otros.
- **Tipo de analítico:** `01` factura (322), `03` boleta (172), `02` recibo por honorarios (18), `DJ` declaración jurada (110), `--` sin comprobante (476).
- **El tipo de cambio en dólares se digita a mano.** La hoja `TC` solo llega hasta el 01/01/2026 y ninguna fila de 2026 coincide con ella.
- **Amarre de destino constante por cuenta:** `6593 → 95/791`, `6373 → 94/791`, `63542 → 95/791`, `6391 → 94/791`. Puede configurarse una vez en el plan contable.

### 2.4 Proceso actual

```mermaid
flowchart LR
    A([Extracto bancario<br/>y comprobantes]) --> B[Contador abre<br/>el Excel del año]
    B --> C{¿Qué cuenta?}
    C -->|Soles| D[Hoja CTA CTE SOLES]
    C -->|Dólares| E[Hoja CTA CTE DÓLARES]
    C -->|Caja| F[Hoja EFECTIVO]
    D & E & F --> G[Busca el último voucher<br/>del mes en las 3 hojas]
    G --> H[Digita fila por fila:<br/>RUC, razón social, detalle,<br/>importe, CTA, COD]
    H --> I[Busca TC del día<br/>en otra fuente]
    I --> J[Revisa a ojo<br/>duplicados y errores]
    J --> K([Pasa al sistema contable])

    classDef manual fill:#fde2e2,stroke:#c0392b,color:#000
    class G,H,I,J manual
```

En rojo, los pasos manuales que el sistema automatiza.

---

## 3. Problemas detectados en el Excel

| # | Problema | Evidencia | Cómo lo resuelve el sistema |
|---|---|---|---|
| 1 | El DNI pierde el cero inicial | 140 documentos de 7 dígitos (`4823957` por `04823957`) | El documento se guarda como texto; un DNI de 7 dígitos se completa con cero |
| 2 | La razón social falla | Celdas con `#N/A` | Maestro de entidades con búsqueda y alta en la misma fila |
| 3 | El correlativo se calcula a mano entre 3 hojas | Saltos de numeración | Correlativo mensual atómico en base de datos |
| 4 | Errores de tipeo en el detalle | `AUTOMORIZ`, `COMSION`, `CAMBIO DE SOLE A DOLARES` | Detalles frecuentes sugeridos por proveedor |
| 5 | El TC se digita a mano | La hoja `TC` no tiene 2026 | Tabla de tipo de cambio diario, sugerido por fecha |
| 6 | Proveedores extranjeros con "RUC" inventado | `1639688899`, `18087220` | Tipo de documento `EXTRANJERO` sin validar dígitos |
| 7 | Vínculos externos rotos | Rutas `Z:\Contabilidad CREES 2017\…` | No hay dependencias de archivos |
| 8 | No hay alerta de duplicados | Mismo analítico registrado dos veces | Aviso por analítico y por RUC + fecha + importe |
| 9 | No hay cierre de mes | Cualquiera puede editar meses pasados | Periodos abiertos y cerrados |
| 10 | Notas sueltas en columnas libres | `SIN BOLETA AUN`, `PEND EMT BL` | Campo `observacion` y filtro de pendientes |
| 11 | Montos con decimales flotantes | `2172.6999999999998` | `NUMERIC(14,2)` en PostgreSQL |

---

## 4. Qué propone el sistema

```mermaid
flowchart LR
    A([Extracto bancario<br/>y comprobantes]) --> B[Registro rápido<br/>elige la cuenta]
    B --> C[Escribe RUC o nombre]
    C --> D[Sistema completa:<br/>razón social, detalle,<br/>CTA, COD, TC, voucher]
    D --> E[Validación en vivo<br/>errores y duplicados]
    E --> F{¿Fila lista?}
    F -->|Sí| G[Ctrl+Enter registra<br/>todas las filas listas]
    F -->|No| C
    G --> H[(PostgreSQL)]
    H --> I[Libro de movimientos<br/>filtros y exportación]
    H --> J[Resumen por cuenta<br/>y cierre de mes]

    classDef auto fill:#d6f5ec,stroke:#16a085,color:#000
    class D,E,G auto
```

Principios del diseño, tomados del prototipo:

1. **Se escribe como en el Excel**: mismas columnas, `Tab` avanza de celda y `Enter` en COD crea la fila siguiente.
2. **Celeste = lo llena el sistema**: voucher, razón social y T.C.
3. **Nada se registra con errores**; los avisos se pueden aceptar.
4. **El sistema aprende**: cada registro alimenta el historial del proveedor (detalles, CTA y COD usados).

---

## 5. Arquitectura

### 5.1 Vista general

```mermaid
flowchart TB
    subgraph Cliente["Navegador"]
        U[Contador / Asistente]
    end

    subgraph Web["apps/web · Next.js + shadcn/ui"]
        P[Páginas App Router]
        SA[Server Actions]
        MW[Middleware de sesión]
    end

    subgraph Api["apps/api · NestJS"]
        G[Guard JWT + Roles]
        M1[Módulo ledger<br/>movimientos y vouchers]
        M2[Módulo masters<br/>entidades, plan, medios]
        M3[Módulo periods<br/>periodos y cierre]
        M4[Módulo exchange-rates]
        M5[Módulo imports<br/>Excel histórico]
        M6[Módulo reports]
        M7[Módulo audit]
    end

    C[["packages/contracts<br/>zod + tipos compartidos"]]
    DB[(PostgreSQL)]
    EXT1[/"Consulta RUC y DNI"/]
    EXT2[/"Tipo de cambio SUNAT"/]

    U -->|HTTPS| P
    P --> SA
    MW -.-> P
    SA -->|REST + cookie| G
    G --> M1 & M2 & M3 & M4 & M5 & M6
    M1 & M2 & M3 & M4 & M5 & M6 --> M7
    M1 & M2 & M3 & M4 & M5 & M6 & M7 -->|Prisma| DB
    M2 -.->|opcional| EXT1
    M4 -.->|opcional| EXT2
    C -.- Web
    C -.- Api
```

- **El frontend no toca la base de datos.** Todo pasa por la API.
- **Los contratos (`packages/contracts`)** definen con zod los DTO que validan la API y los formularios.
- **Cada módulo de la API** está separado en capas `domain / application / infrastructure / presentation` y expone solo su `index.ts`.

### 5.2 Capas de un módulo

```mermaid
flowchart LR
    subgraph ledger["modules/ledger"]
        direction LR
        PR[presentation<br/>controllers, DTO pipes] --> AP[application<br/>casos de uso]
        AP --> DO[domain<br/>reglas: validar fila,<br/>numerar voucher]
        AP --> IN[infrastructure<br/>repositorios Prisma]
        IN --> DO
    end
    X[Otro módulo] -->|solo index.ts| AP
```

### 5.3 Despliegue

```mermaid
flowchart LR
    I((Internet)) --> CF[Cloudflare<br/>modo Full]
    CF --> N[nginx :443<br/>Let's Encrypt]
    N -->|/| W[web · Next.js<br/>conciliacion-bancaria-web :3026]
    N -->|/api| A[api · NestJS<br/>conciliacion-bancaria-api :3027]
    W -->|server actions| A
    A --> PG[(PostgreSQL 16<br/>conciliacion_bancaria)]
```

Publicado en **https://conciliacionbancaria.torresasociados.pe** (Swagger en `/api/docs`).

| Pieza | Dónde |
|---|---|
| Servicios systemd | `conciliacion-bancaria-api` y `conciliacion-bancaria-web` |
| Vhost nginx | `/etc/nginx/sites-available/conciliacion-bancaria` |
| Certificado | `/etc/letsencrypt/live/conciliacionbancaria.torresasociados.pe/` (webroot `/var/www/certbot`) |
| IP del visitante | nginx toma `CF-Connecting-IP` y la pasa como `X-Real-IP` / `X-Cliente-Ip` para limitar intentos de login por persona |

Para publicar cambios:

```bash
pnpm build
pnpm --filter @conciliacion/api db:deploy
systemctl restart conciliacion-bancaria-api conciliacion-bancaria-web
```

---

## 6. Modelo de datos

### 6.1 Diagrama entidad-relación

```mermaid
erDiagram
    usuarios ||--o{ vouchers : registra
    usuarios ||--o{ auditoria : genera
    cuentas_tesoreria ||--o{ vouchers : contiene
    cuentas_contables ||--o{ cuentas_tesoreria : "se contabiliza en"
    periodos ||--o{ vouchers : "agrupa y numera"
    vouchers ||--|{ lineas_voucher : "tiene líneas"
    entidades ||--o{ vouchers : participa
    entidades ||--o{ detalles_frecuentes : aprende
    cuentas_contables ||--o{ lineas_voucher : contrapartida
    cuentas_contables ||--o{ detalles_frecuentes : sugiere
    medios_pago ||--o{ vouchers : "se paga con"
    medios_pago ||--o{ detalles_frecuentes : sugiere
    tipos_comprobante ||--o{ vouchers : sustenta
    cuentas_contables ||--o{ cuentas_contables : "padre de"
    cuentas_contables }o--o| cuentas_contables : "destino debe/haber"
    plantillas ||--o| entidades : usa
    importaciones ||--o{ vouchers : origina

    usuarios {
        uuid id PK
        string nombre
        string email UK
        string hash_clave
        enum rol "ADMIN | CONTADOR | ASISTENTE | LECTOR"
        bool activo
    }
    cuentas_tesoreria {
        uuid id PK
        string nombre "CTA CTE SOLES"
        enum tipo "BANCO | CAJA"
        string banco
        string numero_cuenta
        enum moneda "PEN | USD"
        string cuenta_contable_id FK "1041 / 1011"
        int orden
        bool activa
        decimal saldo_apertura "al día 1 del mes de apertura"
        int apertura_anio
        int apertura_mes
    }
    periodos {
        uuid id PK
        int anio "único con mes"
        int mes
        enum estado "ABIERTO | CERRADO"
        int ultimo_numero "correlativo del mes"
        timestamp cerrado_en
        uuid cerrado_por_id FK
    }
    vouchers {
        uuid id PK
        uuid periodo_id FK
        int numero "único por periodo, MM-NNNNN"
        uuid cuenta_tesoreria_id FK
        date fecha_operacion
        string nro_operacion
        uuid entidad_id FK
        string tipo_comprobante_codigo FK "nulo si --"
        string serie
        string numero_comprobante
        string medio_pago_codigo FK "COD"
        decimal tipo_cambio "1.000 en PEN, digitado en USD"
        enum estado "REGISTRADO | ANULADO"
        string motivo_anulacion
        uuid creado_por_id FK
    }
    lineas_voucher {
        uuid id PK
        uuid voucher_id FK
        int linea "único por voucher"
        string detalle
        decimal ingreso "NUMERIC 14,2"
        decimal egreso "NUMERIC 14,2"
        string cuenta_contable_codigo FK "CTA"
        bool vigente "false si se quitó al editar"
    }
    entidades {
        uuid id PK
        enum tipo_documento "RUC | DNI | EXTRANJERO"
        string numero_documento UK
        string razon_social
        int usos
    }
    detalles_frecuentes {
        uuid id PK
        uuid entidad_id FK
        string detalle
        string cuenta_contable_id FK
        string medio_pago_id FK
        int usos
        timestamp ultimo_uso
        bool activo "false: ya no se sugiere"
    }
    cuentas_contables {
        string codigo PK "2 a 6 dígitos"
        string denominacion
        string padre_codigo FK
        int nivel
        enum tipo "BAL RNA RNF NIN RFU ORD"
        enum clase "ACTIVO PASIVO PATRIMONIO GASTO INGRESO GESTION ORDEN"
        bool analitica
        bool centro_costo
        string destino_debe FK
        string destino_haber FK
        bool activa
    }
    medios_pago {
        string codigo PK "Tabla 1 SUNAT"
        string descripcion
    }
    tipos_comprobante {
        string codigo PK "01 02 03 DJ"
        string descripcion
    }
    plantillas {
        uuid id PK
        int atajo UK "1 a 9; nulo si está desactivada"
        string etiqueta
        uuid entidad_id FK
        string detalle
        string cuenta_contable_codigo FK
        string medio_pago_codigo FK
        string analitico "--, prefijo 01- o vacío"
        enum tipo "EGRESO | INGRESO"
        decimal importe "opcional"
        bool activa
    }
    importaciones {
        uuid id PK
        string archivo
        enum estado "VALIDADA | IMPORTADA | DESCARTADA"
        jsonb datos "vouchers válidos de la vista previa"
        jsonb resumen "hojas, observaciones y amarres"
        int importados
        uuid creado_por_id FK
    }
    auditoria {
        uuid id PK
        uuid usuario_id FK
        string entidad
        string entidad_id
        enum accion "CREAR EDITAR ACTIVAR DESACTIVAR IMPORTAR ANULAR CERRAR REABRIR"
        jsonb antes
        jsonb despues
        timestamp creado_en
    }
```

### 6.2 Notas del modelo

- **Un voucher es un pago con su comprobante; las líneas son sus partidas.** En el Excel, los pagos agrupados (por ejemplo SUNAT: renta de quinta, ESSALUD y SNP) comparten fecha, RUC, analítico y COD, y solo cambian detalle, importe y CTA. Por eso fecha, documento, analítico, COD y T.C. van en `vouchers`, y detalle, ingreso, egreso y CTA en `lineas_voucher`. En la hoja, `Alt+L` agrega una línea al mismo voucher.
- **El correlativo vive en `periodos.ultimo_numero`** y se incrementa dentro de la transacción del registro (la fila del periodo queda bloqueada), igual para todas las cuentas, como hoy en el Excel.
- **Importes en la moneda de la cuenta.** En las cuentas en dólares se guarda el importe en US$ y el T.C. digitado a mano en cada voucher, como en el Excel; el equivalente en soles se calcula con `importe × tipo_cambio`. No hay conexión a SUNAT para el tipo de cambio.
- **`entidades.numero_documento` es texto**, así se conservan los ceros iniciales.
- **El analítico se guarda en tres campos** (tipo, serie y número) para buscar duplicados de forma exacta. En pantalla se muestra unido (`01-FB25-25390113`).
- **No se borra nada**: los vouchers se anulan (`estado = ANULADO`) y queda el registro en `auditoria`.
- **El plan contable** se carga desde `PLAN CONTABLE.xlsx` con su jerarquía (`10 → 104 → 1041`). Solo se usan en movimientos las cuentas de último nivel.

---

## 7. Reglas de negocio

### 7.1 Validación de una fila

```mermaid
flowchart TD
    S([Fila en edición]) --> F{¿Fecha?}
    F -->|No| E1[❌ Falta la fecha]
    F -->|Sí| FP{¿Dentro del periodo?}
    FP -->|No| W1[⚠️ Fuera del periodo]
    FP -->|Sí| R
    W1 --> R{¿Documento válido?<br/>RUC 11 · DNI 8 · extranjero}
    R -->|No| E2[❌ Documento inválido]
    R -->|Sí| RN{¿Existe en el maestro?}
    RN -->|No y sin razón social| E3[❌ Escribe la razón social]
    RN -->|No con razón social| W2[⚠️ Proveedor nuevo]
    RN -->|Sí| D
    W2 --> D{¿Detalle?}
    D -->|No| E4[❌ Falta el detalle]
    D -->|Sí| I{Ingreso / Egreso}
    I -->|Ninguno| E5[❌ Falta el importe]
    I -->|Ambos| E6[❌ No puede tener los dos]
    I -->|Uno| C{¿CTA existe y es de último nivel?}
    C -->|No| E7[❌ CTA inválida]
    C -->|Sí| M{¿COD en Tabla 1 SUNAT?}
    M -->|No| E8[❌ COD inválido]
    M -->|Sí| DU{¿Duplicado?}
    DU -->|Mismo analítico| W3[⚠️ Posible duplicado]
    DU -->|Mismo RUC + fecha + importe| W4[⚠️ Confirma que no sea doble]
    DU -->|No| OK([✅ Fila lista])
    W3 & W4 --> OK2([⚠️ Lista con aviso])
```

Los errores (❌) **bloquean** el registro. Los avisos (⚠️) se muestran pero dejan registrar. La misma función de validación vive en `packages/contracts`, así que el navegador y la API aplican exactamente las mismas reglas.

### 7.2 Ciclo de vida de una fila

```mermaid
stateDiagram-v2
    [*] --> Borrador: Nueva fila / atajo / duplicar
    Borrador --> ConError: falta dato o dato inválido
    Borrador --> ConAviso: duplicado o proveedor nuevo
    Borrador --> Lista: todo válido
    ConError --> Borrador: corrige
    ConAviso --> Lista: acepta aviso
    Lista --> Registrada: Ctrl+Enter
    ConAviso --> Registrada: Ctrl+Enter
    Registrada --> Borrador: Editar (periodo abierto)
    Registrada --> Anulada: Anular con motivo
    Anulada --> [*]
```

### 7.3 Ciclo de vida de un periodo

```mermaid
stateDiagram-v2
    [*] --> Abierto: Se crea al registrar el primer movimiento del mes
    Abierto --> Cerrado: Cerrar mes (CONTADOR o ADMIN)
    Cerrado --> Abierto: Reabrir (solo ADMIN, queda auditado)
    note right of Cerrado
        No se puede registrar,
        editar ni anular
    end note
```

### 7.4 Tipo de cambio

- Cuentas en **PEN**: `T.C = 1.000` fijo, lo pone el sistema.
- Cuentas en **USD**: el T.C. se **digita a mano**, como en el Excel. La fila nueva propone el T.C. de la fila anterior (o del último voucher registrado) y se puede cambiar. Sin T.C. la fila no se registra.
- No hay conexión con SUNAT ni tabla de tipos de cambio: el cliente no lo pidió.

### 7.5 Autocompletado

| Al escribir… | El sistema completa |
|---|---|
| RUC/DNI conocido | Razón social. Si el proveedor tiene un solo detalle histórico, también detalle, CTA y COD. |
| RUC nuevo | Pide la razón social (u opcionalmente la consulta en línea) y crea la entidad al registrar. |
| Detalle conocido del proveedor | CTA y COD. |
| CTA de gasto con amarre | Destino debe/haber (`6593 → 95 / 791`). |
| Fecha en cuenta USD | T.C del día. |
| Cualquier fila | Voucher `MM-NNNNN` reservado al registrar. |

---

## 8. Flujos principales

### 8.1 Registro rápido

```mermaid
sequenceDiagram
    autonumber
    actor C as Contador
    participant W as Web (Next.js)
    participant A as API (NestJS)
    participant DB as PostgreSQL

    C->>W: Abre Registro rápido · CTA CTE SOLES · julio
    W->>A: GET /treasury-accounts, /ledger/sheet, /chart-of-accounts/options
    A->>DB: cuentas, vouchers del mes y próximo correlativo
    A-->>W: hoja, catálogos y próximo voucher
    C->>W: Escribe RUC "2010"
    W->>A: GET /entities/search?q=2010
    A-->>W: Proveedores ordenados por usos
    C->>W: Elige BANCO BBVA PERU
    W->>A: GET /entities/document/20100130204
    A-->>W: ITF → 40181 · 999, MANTENIMIENTO → 42121 · 999
    W-->>C: Completa razón social, detalle, CTA y COD (celeste)
    W->>W: Valida la fila con las reglas de contracts/rules
    W->>A: POST /ledger/vouchers/warnings
    A-->>W: Avisos de duplicado (analítico o documento + fecha + importe)
    C->>W: Ctrl+Enter
    W->>A: POST /ledger/vouchers [filas listas]
    A->>A: Valida de nuevo con las mismas reglas
    A->>DB: BEGIN
    A->>DB: Periodo ABIERTO e incrementa ultimo_numero
    A->>DB: INSERT vouchers + lineas_voucher
    A->>DB: UPSERT entidades + detalles_frecuentes (usos+1)
    A->>DB: INSERT auditoria (REGISTRAR)
    A->>DB: COMMIT
    A-->>W: Vouchers 07-00004…07-00005
    W-->>C: Las filas pasan a registradas (candado)
```

### 8.2 Numeración de vouchers

```mermaid
flowchart LR
    A[Registrar lote] --> B{¿Periodo del mes<br/>existe?}
    B -->|No| C[Crear periodo ABIERTO<br/>y correlativo = 0]
    B -->|Sí| D{¿ABIERTO?}
    D -->|No| X[❌ Rechazar: mes cerrado]
    D -->|Sí| E
    C --> E[UPDATE periodos<br/>SET ultimo_numero = ultimo_numero + n]
    E --> F[Asignar MM-NNNNN<br/>a cada voucher del lote]
    F --> G[(Mismo correlativo para<br/>todas las cuentas)]
```

El `UPDATE` bloquea la fila del periodo durante la transacción, así dos usuarios a la vez nunca obtienen el mismo número. En la hoja, el número que se ve en las filas en edición es provisional (cursiva celeste) y se confirma al registrar.

### 8.3 Cierre de mes

```mermaid
sequenceDiagram
    actor C as Contador
    participant W as Resumen y cierre
    participant A as API
    participant DB as PostgreSQL
    C->>W: Revisa saldos de junio por cuenta
    C->>W: Cerrar Junio 2026
    W->>A: POST /periods/2026/6/close
    A->>A: ¿El mes ya empezó?
    A->>DB: BEGIN · bloquea la fila del periodo
    A->>DB: UPDATE periodos SET estado = CERRADO, cerrado_por
    A->>DB: INSERT auditoria (CERRAR)
    A->>DB: COMMIT
    A-->>W: Mes cerrado
    Note over A,DB: Registrar, editar, anular o importar en junio<br/>bloquea el mismo periodo y responde 409
    C->>W: Reabrir (solo ADMIN) con motivo
    W->>A: POST /periods/2026/6/reopen
    A->>DB: estado = ABIERTO · auditoria (REABRIR, motivo)
```

**Saldos**: cada cuenta tiene un saldo de apertura al día 1 de un mes (Cuentas de tesorería → Apertura). Desde ese mes, `saldo inicial = apertura + ingresos − egresos de los meses anteriores` y `saldo final = saldo inicial + ingresos − egresos del mes`, solo con vouchers registrados y líneas vigentes. Sin apertura, el resumen muestra los movimientos pero no inventa saldos.

---

## 9. Módulos y pantallas

```mermaid
flowchart LR
    L[Login] --> R
    subgraph App["Menú lateral"]
        R["Registro rápido<br/>(hoja de captura)"]
        LB[Libro de movimientos]
        MA[Maestros]
        RS[Resumen y cierre]
        CF[Configuración]
    end
    MA --> MA1[Proveedores y clientes]
    MA --> MA2[Plan contable y amarres]
    MA --> MA3[Medios de pago]
    MA --> MA4[Tipos de comprobante]
    MA --> MA5[Plantillas Alt+1…9]
    CF --> CF1[Cuentas de tesorería]
    CF --> CF2[Usuarios y roles]
    CF --> CF3[Importar Excel]
```

| Pantalla | Qué hace | Estado del diseño |
|---|---|---|
| **Registro rápido** | Hoja de captura por cuenta y mes, autocompletado, vouchers con varias líneas, validación, avisos de duplicado, atajos y registro por lote. | Implementado (fase 2) |
| **Libro de movimientos** | Vouchers del mes con filtros (cuenta, estado y búsqueda por voucher, documento, razón social, analítico, detalle o CTA), totales por moneda, edición, anulación con motivo y exportación a Excel con las columnas del modelo. | Implementado (fase 3) |
| **Maestros** | Proveedores (razón social y detalles frecuentes: corregir o desactivar), plan contable (importación, creación y edición de cuentas con jerarquía automática, y amarre de destino), medios de pago, tipos de comprobante y plantillas de atajos. | Implementado (fase 4) |
| **Resumen y cierre** | Por mes y cuenta: saldo inicial, ingresos, egresos y saldo final desde el saldo de apertura; tabla del año; estado de cada mes; cerrar (ADMIN y CONTADOR) y reabrir con motivo (ADMIN). | Implementado (fase 6) |
| **Configuración** | Cuentas de tesorería, usuarios y roles, importación del Excel histórico. | Por diseñar |

### 9.1 Atajos de teclado

| Tecla | Acción | Estado |
|---|---|---|
| `Tab` | Siguiente celda | Implementado |
| `Enter` en COD | Nueva fila con la misma fecha | Implementado |
| `F4` | Copiar el valor de la celda de arriba | Implementado |
| `Alt+L` | Agregar línea al mismo voucher (pago agrupado) | Implementado |
| `Alt+D` | Duplicar la fila anterior | Implementado |
| Manito en la columna # o `Alt+Shift+↑` `↓` | Mover una fila en edición arriba o abajo; los vouchers se numeran en ese orden al registrar | Implementado |
| Manito en vouchers registrados | Mover cualquier voucher vigente (administrador o contador, mes abierto), aunque haya otro en edición; la hoja reparte sus mismos números de menor a mayor según la fila, sin tocar otras cuentas. Los anulados se ocultan de la hoja (botón "Ver anulados"), no cuentan en el orden y conservan su número. Cada cambio queda en auditoría como RENUMERAR | Implementado |
| `Alt+N` | Fila nueva | Implementado |
| `Ctrl+Enter` | Registrar todas las filas listas | Implementado |
| `Alt+1…9` | Insertar una plantilla: crea la fila llena y deja el cursor donde falta el dato (analítico o importe) | Implementado |

Las filas en edición se guardan en el navegador mientras no se registran, así que recargar la página no las pierde.

### 9.2 Roles

| Rol | Registrar | Editar / anular | Cerrar mes | Reabrir mes | Maestros | Usuarios |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| CONTADOR | ✅ | ✅ | ✅ | — | ✅ | — |
| ASISTENTE | ✅ | Solo lo suyo, mes abierto | — | — | Solo entidades | — |
| LECTOR | — | — | — | — | — | — |

---

## 10. API

Prefijo `/api`. Autenticación con JWT en cookie `httpOnly`. La documentación interactiva se genera con **Swagger (OpenAPI)** en `/api/docs`, a partir de los decoradores de los controladores y de los DTO creados desde los esquemas zod de `packages/contracts`.

**Implementados** (detalle completo en Swagger):

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/login` · `/auth/logout` · `GET /auth/me` | Sesión |
| `GET` `POST` `PUT` `PATCH` | `/users` · `/users/:id` · `/users/:id/activation` · `/users/:id/password` | Usuarios (solo ADMIN) |
| `GET` | `/chart-of-accounts?q=&prefijo=&movimiento=&activa=` · `/chart-of-accounts/:codigo` | Plan contable paginado |
| `GET` | `/chart-of-accounts/options` | Cuentas de movimiento activas, para autocompletar la CTA |
| `POST` | `/chart-of-accounts/import` | Carga el Excel del plan contable |
| `POST` `PUT` | `/chart-of-accounts` · `/chart-of-accounts/:codigo` | Crea una cuenta (padre y nivel automáticos) o edita su denominación, tipo, clase, moneda y marcas |
| `PATCH` | `/chart-of-accounts/:codigo/activation` | Activar o desactivar cuenta |
| `GET` `PATCH` | `/payment-methods` · `/payment-methods/:codigo/activation` | Tabla 1 SUNAT |
| `GET` `POST` `PATCH` | `/voucher-types` · `/voucher-types/:codigo/activation` | Tipos de comprobante del analítico |
| `GET` `POST` `PUT` `PATCH` | `/treasury-accounts` · `/treasury-accounts/:id` · `/treasury-accounts/:id/activation` | Cuentas de tesorería |
| `GET` | `/entities/search?q=` | Proveedores por documento o nombre, ordenados por uso |
| `GET` | `/entities/document/:documento` | Proveedor con sus detalles frecuentes |
| `GET` | `/entities/lookup/:documento` | Consulta un RUC en SUNAT o un DNI en RENIEC vía PeruDevs (valida el dígito verificador del RUC; 503 si no está configurado) |
| `GET` | `/ledger/sheet?cuenta=&anio=&mes=` | Hoja de una cuenta en un mes y próximo correlativo |
| `POST` | `/ledger/vouchers/warnings` | Avisos de duplicado sin guardar |
| `PUT` | `/ledger/sheet/order` | Reordena los vouchers de una cuenta y mes; los renumera con sus mismos números |
| `POST` | `/ledger/vouchers` | Registra un lote de vouchers en una transacción |
| `GET` | `/ledger/vouchers?anio=&mes=&cuenta=&estado=&q=` | Libro de movimientos paginado con totales por moneda |
| `GET` | `/ledger/vouchers/:id` | Un voucher con sus líneas vigentes |
| `PUT` | `/ledger/vouchers/:id` | Edita un voucher del mes abierto conservando su número |
| `POST` | `/ledger/vouchers/:id/void` | Anula con motivo |
| `GET` | `/ledger/export.xlsx?anio=&mes=&cuenta=` | Excel con una hoja por cuenta y las columnas del modelo |
| `GET` | `/entities?q=&pagina=` · `/entities/:id` | Proveedores paginados y ficha con todos sus detalles |
| `PUT` | `/entities/:id` | Corrige la razón social |
| `PUT` `PATCH` | `/entities/:id/details/:detalleId` · `/activation` | Corrige o desactiva un detalle frecuente |
| `PUT` | `/chart-of-accounts/:codigo/destinations` | Amarre de destino debe y haber |
| `GET` `POST` `PUT` `PATCH` | `/templates` · `/templates/:id` · `/templates/:id/activation` | Plantillas de atajos Alt+1…9 |
| `GET` `POST` | `/imports` · `/imports/:id` | Historial y subida del Excel con vista previa |
| `POST` | `/imports/:id/confirm` · `/imports/:id/discard` | Confirmar con la cuenta de cada hoja, o descartar |

| `PUT` | `/treasury-accounts/:id/opening` | Saldo de apertura de una cuenta |
| `GET` | `/periods?anio=` | Los 12 meses con estado y conteos |
| `POST` | `/periods/:anio/:mes/close` · `/reopen` | Cerrar (ADMIN, CONTADOR) o reabrir con motivo (ADMIN) |
| `GET` | `/reports/summary?anio=&mes=` · `/reports/year?anio=` | Saldos del mes por cuenta y resumen anual |

**Previsto**: la conciliación contra el extracto bancario (fase 7) depende de la decisión pendiente 1.

### 10.1 Edición y anulación

```mermaid
flowchart LR
    L[Libro de movimientos] -->|Editar| Q[Registro rápido<br/>fila en edición con su número]
    R[Hoja: lápiz en la fila] --> Q
    Q -->|Ctrl+Enter| V{¿Mes abierto,<br/>no anulado y con permiso?}
    V -->|No| X[Rechazo con motivo]
    V -->|Sí| E[Actualiza cabecera y líneas<br/>líneas quitadas: vigente = false]
    E --> A[(auditoria EDITAR<br/>antes y después)]
    L -->|Anular + motivo| N[estado = ANULADO<br/>el número no se reutiliza]
    N --> A2[(auditoria ANULAR)]
```

- **No se borra nada**: al editar, las líneas que se quitan quedan con `vigente = false`; al anular, el voucher queda con su motivo y sale del Excel y de los totales.
- **La fecha no puede cambiar de mes**: el número `MM-NNNNN` pertenece al mes. Para moverlo, se anula y se registra de nuevo.
- **Permisos**: ADMIN y CONTADOR modifican cualquier voucher; ASISTENTE solo los que registró; LECTOR solo consulta.
- **Excel**: columnas `Nº/Cheque/Operación · N# Voucher · Fecha Operación · Analítico · Ruc · Razón social · Detalle · T.C · Ingreso · Egreso · CTA · COD · Destino debe · Destino haber`, una fila por línea (los pagos agrupados repiten el voucher, como en el modelo) y una hoja por cuenta. Las dos últimas columnas salen del amarre configurado en el plan contable (las columnas M y N del modelo).

### 10.2 Maestros y plantillas

- **Proveedores**: se crean solos al registrar. En su ficha se corrige la razón social (por ejemplo los `#N/A` del Excel) y los detalles aprendidos: se puede cambiar su texto, CTA o COD, o desactivarlos para que dejen de sugerirse. El documento no se edita.
- **Plan contable**: además de importarlo, se crean cuentas nuevas (por ejemplo `104115` bajo `10411`). La cuenta superior y el nivel salen del código; si la superior era de movimiento pasa a agrupadora, y se rechaza si la usa una cuenta de tesorería o una plantilla activa. Si se crea una cuenta intermedia (por ejemplo `3340` cuando ya existe `33404`), las subcuentas pasan a colgar de ella. El código no se edita; la denominación, tipo, clase, moneda y marcas sí.
- **Búsqueda**: los buscadores del plan contable, proveedores y libro filtran mientras se escribe, sin botón. Aceptan palabras sueltas en cualquier orden, sin tildes y con un error de tipeo por palabra (`mavisur` encuentra "Mavizur", `chica caja` encuentra "Caja Chica"); los resultados más parecidos salen primero. Las sugerencias de CTA, COD y detalle de la hoja usan la misma regla. En PostgreSQL usa las extensiones `unaccent`, `pg_trgm` y `fuzzystrmatch`, activadas por migración.
- **Consulta de RUC y DNI**: en el registro rápido, si el documento no existe en el sistema se consulta SUNAT (RUC) o RENIEC (DNI) mediante PeruDevs y se llena la razón social si está vacía, con la etiqueta de la fuente. Un RUC en estado distinto de ACTIVO o con domicilio distinto de HABIDO queda como aviso en la fila. En la ficha del proveedor, el botón "Traer de SUNAT/RENIEC" propone la razón social oficial. Antes de consultar se valida el dígito verificador del RUC, y los resultados se recuerdan 12 horas para no repetir consultas.
- **Amarre de destino**: cada cuenta de movimiento puede tener destino debe y haber (por ejemplo `6593 → 95 / 791`, `6373 → 94 / 791`). Se piden los dos o ninguno.
- **Plantillas**: hasta 9 activas, una por tecla. Al desactivar una plantilla su tecla queda libre; al reactivarla recupera la suya si sigue libre o toma la primera disponible.

```mermaid
flowchart LR
    P[Alt+2 · Mantenimiento] --> F[Fila nueva con proveedor,<br/>detalle, CTA, COD,<br/>analítico 01- e importe 10.00]
    F --> C{¿Qué falta?}
    C -->|Prefijo 01-| A[Cursor en el analítico<br/>para la serie y el número]
    C -->|Sin importe| I[Cursor en Ingreso o Egreso]
    C -->|Todo completo| D[Cursor en la fecha]
```

---

## 11. Estructura del repositorio

```text
conciliacion-bancaria/
├── apps/
│   ├── api/                          NestJS
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts               catálogos SUNAT y primer administrador
│   │   └── src/
│   │       ├── main.ts               prefijo /api, cookies y Swagger
│   │       ├── app.module.ts
│   │       ├── modules/
│   │       │   ├── audit/            registro de acciones
│   │       │   ├── identity/         login, usuarios, roles
│   │       │   ├── masters/          plan contable, catálogos SUNAT, cuentas de tesorería
│   │       │   ├── periods/          periodos, correlativo mensual, cierre y reapertura
│   │       │   ├── entities/         proveedores y detalles frecuentes
│   │       │   ├── templates/        plantillas de atajos Alt+1…9
│   │       │   ├── imports/          lectura del Excel modelo, vista previa e importación
│   │       │   ├── reports/          saldos por cuenta, resumen mensual y anual
│   │       │   └── ledger/           hoja, registro, edición, anulación y exportación a Excel
│   │       └── shared/               prisma, config, errores, documentación Swagger
│   └── web/                          Next.js + shadcn/ui
│       ├── components.json
│       └── src/
│           ├── app/
│           │   ├── login/
│           │   └── (app)/
│           │       ├── quick-entry/  Registro rápido
│           │       ├── ledger/       Libro de movimientos y descarga del Excel
│           │       ├── summary/      Resumen y cierre
│           │       ├── masters/      proveedores, plantillas, plan contable, medios de pago, tipos de comprobante
│           │       └── settings/     cuentas de tesorería, usuarios, importar Excel
│           ├── modules/              lógica por módulo (actions.ts y ui/)
│           ├── components/ui/        componentes de shadcn
│           └── shared/               cliente de la API, sesión, componentes comunes
├── packages/
│   └── contracts/                    esquemas zod, enums (/enums) y reglas de validación (/rules)
├── public/
│   └── documentos/                   material de referencia
├── pnpm-workspace.yaml
└── README.md
```

Componentes de shadcn/ui previstos: `table`, `input`, `command` (sugerencias de proveedor, CTA y COD), `popover`, `tabs` (cuentas), `select`, `dialog`, `badge` (estado de fila), `tooltip`, `sonner`, `form`, `data-table` con TanStack Table para el libro.

---

## 12. Instalación y desarrollo

### Requisitos

| Herramienta | Versión |
|---|---|
| Node.js | 18 (el del servidor; por eso NestJS 10 y Next.js 14) |
| pnpm | 9 |
| PostgreSQL | 16 |

### Pasos

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm --filter @conciliacion/contracts build
pnpm --filter @conciliacion/api db:generate
pnpm --filter @conciliacion/api db:deploy
SEED_ADMIN_NOMBRE="..." SEED_ADMIN_EMAIL="..." SEED_ADMIN_PASSWORD="..." pnpm --filter @conciliacion/api db:seed
pnpm build
```

La semilla carga la Tabla 1 de SUNAT (medios de pago) y los tipos de comprobante. El primer administrador solo se crea si no hay usuarios; sus datos se pasan por variables de entorno y no se guardan en ningún archivo. El plan contable se carga desde la pantalla **Plan contable → Importar plan contable**.

| Comando | Qué hace |
|---|---|
| `pnpm dev:api` | API en modo desarrollo (`:3027`) |
| `pnpm dev:web` | Web en modo desarrollo (`:3026`) |
| `pnpm typecheck` | Verifica tipos de los tres paquetes |
| `pnpm lint` | ESLint sin advertencias |
| `pnpm build` | Compila contracts, API y web |

Las migraciones nuevas se generan con `prisma migrate diff` y se aplican con `db:deploy`; no se usa `prisma migrate reset` ni `db push`.

### Documentación de la API

Con la API levantada, Swagger queda en `http://127.0.0.1:3027/api/docs` y el JSON de OpenAPI en `/api/docs-json`.

### Variables de entorno

| App | Variable | Uso |
|---|---|---|
| api | `DATABASE_URL` | `postgresql://usuario:clave@127.0.0.1:5432/conciliacion_bancaria?schema=public` |
| api | `AUTH_SECRET` | Firma del JWT, mínimo 32 caracteres |
| api | `PORT` · `HOST` | `3027` · `127.0.0.1` |
| api | `APP_URL` | URL pública de la web |
| api | `SEED_ADMIN_*` | Solo para la semilla del primer administrador |
| api | `PERUDEVS_URL` · `PERUDEVS_TOKEN` | Opcionales. URL base y token de PeruDevs para consultar RUC y DNI; sin ellos la razón social se escribe a mano |
| web | `API_URL` | `http://127.0.0.1:3027` |
| web | `AUTH_SECRET` | El mismo secreto de la API, para validar la sesión en el middleware |
| web | `APP_URL` | URL pública; si empieza con `https://` la cookie de sesión es `Secure` |

Los `.env` **no se suben al repositorio**.

---

## 13. Migración del Excel histórico

Implementado en la fase 5 (**Configuración → Importar Excel**, solo ADMIN y CONTADOR). Para no empezar de cero, se importa el histórico desde el modelo.

```mermaid
flowchart TD
    A[Subir MODELO DE CONCILIACION BANCOS.xlsx] --> B[Leer solo hojas visibles<br/>con columnas del modelo]
    B --> C[Encabezados repetidos por mes:<br/>cada uno hereda las columnas<br/>que le falten al anterior]
    C --> D[Normalizar:<br/>fecha serial → date<br/>DNI de 7 dígitos → 0 + DNI<br/>analítico 1-... → 01-...<br/>importes → 2 decimales]
    D --> E[Agrupar las líneas<br/>del mismo voucher]
    E --> F{Validar con las reglas<br/>del registro rápido}
    F -->|Error: sin RUC, sin COD,<br/>CTA inválida, número repetido<br/>o ya registrado| G[Voucher omitido<br/>y listado]
    F -->|Válido| H[Vista previa guardada:<br/>hojas, meses, totales,<br/>proveedores nuevos y amarres]
    G --> H
    H --> I{¿Confirma y asigna<br/>cada hoja a una cuenta?}
    I -->|Descartar| X[Estado DESCARTADA]
    I -->|Sí| J[Una transacción:<br/>vouchers con su número original]
    J --> K[Proveedores y detalles<br/>con sus usos reales]
    K --> L[Correlativo de cada mes<br/>= último número importado]
    L --> M[Amarres de destino<br/>en cuentas que no tenían]
```

- **Números originales**: `01-00053` se importa como `01-00053`. Si un número ya existe en el sistema o se repite entre hojas, ese voucher se omite y se avisa.
- **Moneda de la hoja**: se detecta por el T.C. (distinto de 1 = dólares) y solo puede asignarse a una cuenta de esa moneda. La cuenta se sugiere por nombre.
- **Fechas fuera de mes**: si el voucher es `04-…` pero la fecha es de mayo, se importa en abril con su fecha original y queda como aviso.
- **Prueba con el modelo real**: 1 082 vouchers válidos de enero a junio (101 en dólares, 676 en soles y 305 en efectivo) en unos 9 segundos. Se omitieron 15 por problemas del Excel: sin RUC (`#N/A`), sin COD, analítico inválido o número repetido entre soles y efectivo.

Gracias a la importación, el autocompletado arranca con el historial real de proveedores, detalles, CTA y COD.

---

## 14. Hoja de ruta

```mermaid
flowchart LR
    F0[Fase 0<br/>Análisis y README] --> F1
    F1[Fase 1<br/>Monorepo, auth,<br/>Prisma, catálogos,<br/>plan contable] --> F2
    F2[Fase 2<br/>Registro rápido<br/>+ validación<br/>+ correlativo] --> F3
    F3[Fase 3<br/>Libro de movimientos<br/>edición, anulación,<br/>exportación Excel] --> F4
    F4[Fase 4<br/>Maestros, amarres<br/>y plantillas] --> F5
    F5[Fase 5<br/>Importación del<br/>Excel histórico] --> F6
    F6[Fase 6<br/>Resumen, saldos<br/>y cierre de mes] --> F7
    F7[Fase 7<br/>Conciliación contra<br/>extracto bancario] --> F8[Fase 8<br/>QA y despliegue]

    style F0 fill:#d6f5ec,stroke:#16a085,color:#000
    style F1 fill:#d6f5ec,stroke:#16a085,color:#000
    style F2 fill:#d6f5ec,stroke:#16a085,color:#000
    style F3 fill:#d6f5ec,stroke:#16a085,color:#000
    style F4 fill:#d6f5ec,stroke:#16a085,color:#000
    style F5 fill:#d6f5ec,stroke:#16a085,color:#000
    style F6 fill:#d6f5ec,stroke:#16a085,color:#000
    style F7 stroke-dasharray: 5 5
```

La fase 7 (en línea punteada) depende de una decisión pendiente.

---

## 15. Decisiones pendientes

Hay que confirmarlas con el usuario antes de implementar la fase afectada.

Ya resueltas: el T.C. se sigue digitando a mano (sin conexión a SUNAT), los importes se guardan en la moneda de la cuenta con su T.C., y los pagos con varias partidas se agrupan en un solo voucher con su analítico.

| # | Pregunta | Por qué importa | Fase |
|---|---|---|---|
| 1 | ¿Quieren **conciliar contra el extracto bancario** (importar el CSV/Excel del banco y cruzarlo), o "conciliación" es solo el libro de bancos? | El Excel actual no compara contra el banco; sería un módulo nuevo. | 7 |
| 4 | ¿Hacia qué sistema contable se exporta y en qué formato? | El plan contable tiene formato de importación (`COD_CTA`, `DEN_CTA`, `TIP_CTA`, `FLAG_CUENTA_ANALITICA`…). | 3 |
| 5 | ¿Cuál es el saldo inicial de cada cuenta al 01/01/2026? | Se carga en Cuentas de tesorería → Apertura; sin él, el resumen no muestra saldos. | 6 (pendiente del cliente) |
| 6 | ¿Cuántos usuarios hay y quién cierra el mes? | Define los roles. | 1 |
| 7 | ¿Se reactivan las cuentas ocultas (INNOVATE, TURISMO EMPRENDE, DML)? | Hoy son hojas ocultas con datos de otros años. | 1 |
| 9 | ¿Consulta automática de RUC/DNI (PeruDevs, con costo por consulta)? | Ahorra digitar razones sociales nuevas. | 4 |
| 10 | ¿Se adjunta el comprobante (PDF/imagen) al movimiento? | Requiere almacenamiento de archivos. | 3 |

---

## 16. Convenciones

- **Commits** convencionales en español (`feat:`, `fix:`, `docs:`…), uno por archivo.
- **Nombres de archivos y carpetas en inglés** (`quick-entry/`, `ledger.service.ts`); **identificadores, textos de la UI y documentación en español**.
- **TypeScript estricto.**
- **Sin `any`, sin comentarios, sin emojis en el código, sin `placeholder` en los inputs y sin soluciones temporales.** La API se documenta con Swagger.
- Las reglas completas para personas y agentes de IA están en [`AGENTS.md`](AGENTS.md) (y [`CLAUDE.md`](CLAUDE.md) las importa).
- **No se elimina información**: los registros se anulan o se desactivan.
- **Montos** con `NUMERIC(14,2)` y tipo de cambio con `NUMERIC(10,3)`; nunca `float`.
- **Fechas** en zona `America/Lima`.
