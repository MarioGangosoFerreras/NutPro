<div align="center">
  <img src="public/img/Logo_app.png" alt="NutPro Logo" width="150"/>
  <h1>NutPro</h1>
  <p><b>La plataforma integral para nutricionistas y pacientes</b></p>

  <img src="https://img.shields.io/badge/Angular-21-DD0031?style=flat-square&logo=angular" alt="Angular">
  <img src="https://img.shields.io/badge/Ionic-8-3880FF?style=flat-square&logo=ionic" alt="Ionic">
  <img src="https://img.shields.io/badge/Supabase-BaaS-3ECF8E?style=flat-square&logo=supabase" alt="Supabase">
  <img src="https://img.shields.io/badge/Capacitor-Android%20%7C%20iOS-119EFF?style=flat-square&logo=capacitor" alt="Capacitor">
</div>

---

## 🚀 Sobre el Proyecto

**NutPro** es una aplicación moderna y multiplataforma diseñada para optimizar el trabajo de los dietistas-nutricionistas y mejorar la experiencia de sus pacientes. Permite gestionar desde la agenda y facturación del profesional, hasta el seguimiento diario, visualización de menús y chat en tiempo real por parte del paciente.

---

## 📱 Prueba la App (Android)

Si deseas probar la experiencia móvil directamente en tu dispositivo sin configurar el entorno de desarrollo:

1. Dirígete a la sección de [**Releases**](https://github.com/tu-usuario/nutpro/releases) de este repositorio.
2. Descarga el archivo `.apk` de la versión más reciente.
3. En tu dispositivo Android, abre el archivo descargado para iniciar la instalación.
   - *Nota: Es posible que debas permitir la "Instalación de aplicaciones de fuentes desconocidas" en los ajustes de seguridad de tu teléfono.*
4. ¡Inicia sesión y comienza a gestionar tus planes nutricionales!

---

## ✨ Características Principales

### 🧑‍⚕️ Para el Profesional (Nutricionista)
- **Panel de Control:** Visión general de pacientes, citas y estado de facturación.
- **Gestión Clínica:** Fichas con cálculo automático de IMC e ICC y evolución gráfica.
- **Planes y Recetas:** Configurador de macros, conexión con *Open Food Facts* y menús semanales.
- **Agenda:** Calendario con sincronización bidireccional con **Google Calendar**.
- **Chat:** Comunicación directa en tiempo real.
- **Facturación:** Generación automática de facturas en PDF.

### 👤 Para el Paciente
- **Mi Dieta:** Menú semanal y recetas con detalle de macros.
- **Evolución:** Registro de hábitos (agua, sueño, fruta) y gráficas de peso.
- **Citas:** Gestión de sesiones y enlaces a videollamadas.
- **Documentos:** Historial de facturas e informes compartidos.

---

## 🛠️ Tecnologías y Arquitectura

* **Frontend:** Angular 21 y Ionic UI Components.
* **Backend:** Supabase (Auth, DB, Realtime, Edge Functions).
* **Móvil:** Capacitor para compilación nativa.
* **Servicios:** Cloudinary (Imágenes) y Google Calendar API.

---

## 💻 Instalación y Desarrollo Local

### 📋 Requisitos Previos
* **Node.js** (v18+)
* **Angular CLI** (`npm install -g @angular/cli`)

### 🛠️ Pasos para ejecutar
1. **Clonar:** `git clone <URL_REPOSITORIO>` y `cd nutpro`
2. **Dependencias:** `npm install`
3. **Entorno:** Configura tus credenciales en `src/environments/environment.ts`.
4. **Servidor:** `ng serve` (Accede en `http://localhost:4200/`).

---

## 📂 Estructura del Proyecto

* `/src/app/core/` - Servicios globales, guards e integraciones de Supabase.
* `/src/app/features/` - Módulos de negocio (Admin, Dieta, Chat, Pacientes).
* `/src/app/shared/` - Componentes comunes (Header, Calendario, Shell).
* `/supabase/` - Código de las Edge Functions en Deno.

---

<div align="center">
  <i>Desarrollado con ❤️ para transformar la nutrición digital.</i>
</div>
