import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { defineCustomElements } from '@ionic/pwa-elements/loader';

bootstrapApplication(App, appConfig)
  // Definir los elementos personalizados cuando la app arranque
  .then(() => defineCustomElements(window))
  .catch((err) => console.error(err));