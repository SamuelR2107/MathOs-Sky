import {iniciarInterfaz} from './interfaz.js';
import {conectarEscenarios} from './controlador.js';
export const interfaz=iniciarInterfaz();
export const aplicacion=conectarEscenarios(interfaz);
// El cálculo pesado se importa exclusivamente dentro del Worker de módulo.
