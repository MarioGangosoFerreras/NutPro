<div align="center">
  <img src="public/img/Logo_app.png" alt="NutPro Logo" width="150"/>
  <h1>NutPro</h1>
  <p><b>La plataforma integral para nutricionistas y pacientes</b></p>
</div>

---

## 🚀 Sobre el Proyecto

**NutPro** es una aplicación moderna y multiplataforma diseñada para optimizar el trabajo de los dietistas-nutricionistas y mejorar la experiencia de sus pacientes. Permite gestionar desde la agenda y facturación del profesional, hasta el seguimiento diario, visualización de menús y chat en tiempo real por parte del paciente.

El proyecto está construido con una arquitectura moderna basada en **Angular**, utilizando componentes de **Ionic** para un diseño adaptativo (Web/PWA/Móvil) y **Supabase** como backend como servicio (BaaS).

---

## ✨ Características Principales

### 🧑‍⚕️ Para el Profesional (Nutricionista)
- **Panel de Control (Dashboard):** Visión general de pacientes activos, citas del día, mensajes sin leer y estado de facturación.
- **Gestión de Pacientes:** Fichas clínicas detalladas con antecedentes, mediciones antropométricas (cálculo automático de IMC e ICC) y evolución gráfica.
- **Planes Nutricionales y Recetas:** - Configurador de planes cuantitativos (cálculo de TMB y macros) y cualitativos.
  - Base de datos de recetas propias y conexión con la API de *Open Food Facts* para importar alimentos reales.
  - Generación de menús semanales.
- **Agenda y Citas:** Calendario integrado con sincronización bidireccional con **Google Calendar**.
- **Chat en Tiempo Real:** Comunicación directa con los pacientes, estilo WhatsApp.
- **Facturación y Documentos:** Generación automática de facturas en PDF y almacenamiento de analíticas/informes.

### 👤 Para el Paciente (Portal del Paciente)
- **Mi Dieta:** Visualización clara del menú semanal y recetas asignadas con sus macros.
- **Evolución y Hábitos:** Registro diario de agua, fruta y sueño. Gráficas de evolución de peso y medidas.
- **Citas:** Solicitud de nuevas citas y visualización de próximas sesiones (con enlaces a videollamadas si aplica).
- **Documentos:** Acceso a facturas e informes compartidos por el profesional.

### ⚙️ Administración
- Panel dedicado para verificar y aprobar el alta de nuevos nutricionistas en la plataforma.

---

## 🛠️ Tecnologías y Arquitectura

* **Frontend:** Angular 21 (Stand-alone components), Ionic UI Components.
* **Móvil / Multiplataforma:** Capacitor (Android/iOS).
* **Backend & BaaS:** Supabase (Auth, PostgreSQL, Storage, Realtime para el chat).
* **Edge Functions (Deno):** Proxies para integración segura con *Google Calendar API* y *Open Food Facts API*.
* **Gestión de Archivos:** Cloudinary (avatares) y Supabase Storage (documentos).
* **Librerías Adicionales:** * `Chart.js`: Para gráficas de evolución clínica y facturación.
  * `jsPDF` y `jspdf-autotable`: Para generación de PDFs (menús y facturas).

---

## 🚀 Instalación y Desarrollo Local

### 📋 Requisitos Previos
* **Node.js**: [Descargar aquí](https://nodejs.org/) (Versión 18+ recomendada).
* **Angular CLI**: Instalado globalmente (`npm install -g @angular/cli`).
* **Supabase CLI** (Opcional, para desarrollo local de base de datos y Edge Functions).

### 🛠️ Pasos para ejecutar

1. **Clonar el repositorio:**

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar Variables de Entorno:**
   Asegúrate de configurar correctamente los valores en `src/environments/environment.ts` con tus credenciales de Supabase, Cloudinary y Google OAuth.

4. **Levantar el servidor de desarrollo:**
   ```bash
   ng serve
   ```
   Abre tu navegador en `http://localhost:4200/`.

---

## 📱 Compilación para Móvil (Capacitor)

El proyecto está preparado para exportarse como aplicación móvil nativa.

**Para Android:**
```bash
# Compilar el proyecto Angular
npm run build

# Sincronizar con Capacitor
npx cap sync android

# Abrir en Android Studio
npx cap open android
```

---

## 📂 Estructura del Proyecto

* `/src/app/core/` - Servicios globales, guards de autenticación e integraciones (Auth, Supabase, Cloudinary).
* `/src/app/features/` - Módulos principales separados por dominio:
    * `/admin/` - Panel de administrador.
    * `/ajustes/` - Configuración de cuenta y sincronización (Google Calendar).
    * `/alimentacion/` - Base de datos de recetas e ingredientes.
    * `/auth/` - Login, Registro y flujos de recuperación.
    * `/dashboard/` - Vistas del panel principal y estadísticas.
    * `/facturacion/` - Control de pagos y gráficas de ingresos.
    * `/mensajes/` - Chat en tiempo real.
    * `/pacientes/` - CRM del nutricionista (Fichas, mediciones, planes, dietas).
    * `/portal-paciente/` - Entorno dedicado y simplificado para el paciente.
* `/src/app/shared/` - Componentes reutilizables (Menú lateral/Shell, Header, Calendario, Tarjetas).
* `/supabase/` - Configuración y código fuente de las Edge Functions (Deno).

---

<div align="center">
  <i>Desarrollado con ❤️ para transformar la forma en la que los nutricionistas trabajan.</i>
</div>
