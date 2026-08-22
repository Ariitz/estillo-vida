# AURA Nexus — SPA de Estilo de Vida y Gestión Modular

**AURA Nexus** es una Single Page Application (SPA) modular, reactiva y persistente construida con **React 18+**, **Tailwind CSS v4** y **Lucide-React**. La interfaz de usuario implementa una estética de alta gama en **Dark Mode (Obsidian & Rose Gold)** diseñada para maximizar la legibilidad y ofrecer micro-interacciones premium.

---

## 1. Arquitectura de la Aplicación

La aplicación está diseñada bajo una arquitectura modular y centralizada en un solo estado reactivo en `src/App.jsx` (Lifting State Up). Esto permite que todos los submódulos compartan información de forma síncrona en tiempo real y que se guarden automáticamente en el `localStorage` del navegador.

### Estructura de Directorios
```
EstiloVida/
├── dist/                     # Carpeta de build para producción
├── node_modules/             # Dependencias del proyecto
├── src/
│   ├── components/
│   │   ├── ExperiencesModule.jsx     # Módulo 3: Bitácora de Lugares/Productos
│   │   ├── ManualsModule.jsx         # Módulo 5: Biblioteca de Protocolos
│   │   ├── PriceComparatorModule.jsx # Módulo 2: Comparador Multitienda
│   │   ├── ScheduleModule.jsx        # Módulo 1: Rutinas & Agua
│   │   ├── TimersModule.jsx          # Módulo 6: Temporizadores de Tratamientos
│   │   ├── Toast.jsx                 # Sistema flotante de notificaciones
│   │   └── WardrobeModule.jsx        # Módulo 4: Armario Virtual & Outfits
│   ├── App.jsx               # Contenedor raíz, estados globales y navegación
│   ├── index.css             # Estilos de Tailwind v4 y variables de diseño
│   └── main.jsx              # Punto de montaje de React en el DOM
├── index.html                # Plantilla de carga de Vite
├── package.json              # Manifiesto de npm, scripts y dependencias
└── vite.config.js            # Configuración del bundler Vite
```

### Flujo de Datos y Persistencia
- **Inicialización de Datos**: Si el navegador no cuenta con registros guardados (primer inicio), la aplicación carga conjuntos de datos completos y funcionales (checklist diario, insumos de ejemplo, armario inicial, manuales y timers predefinidos).
- **Reactividad de Estados**: Toda adición, eliminación, edición o check activa una actualización de estado en `App.jsx`, lo que a su vez ejecuta un `useEffect` que guarda el cambio en el `localStorage` mediante claves individuales (`aura-weight`, `aura-schedule`, etc.).

---

## 2. Guía de Escalabilidad (Añadir Nuevas Funcionalidades)

La arquitectura de AURA Nexus está planeada para crecer orgánicamente. A continuación se explica cómo extender cada aspecto de la SPA:

### A. Cómo Agregar un Nuevo Módulo Completo
1. **Crear el componente del módulo**: Añade un nuevo archivo en `src/components/` (ej. `src/components/FinanceModule.jsx`).
2. **Definir el estado en `App.jsx`**: Si tu módulo requiere datos persistentes, añade un estado React con su correspondiente inicializador de `localStorage` y su `useEffect` de guardado automático.
3. **Modificar el Sidebar**: En `src/App.jsx`, localiza la constante `menuItems` y añade el nuevo módulo con su respectivo ID, etiqueta e icono de Lucide:
   ```javascript
   { id: 'finance', label: 'Finanzas Personales', icon: <DollarSign className="w-5 h-5" /> }
   ```
4. **Actualizar títulos del Header**: Agrega la traducción/título en la constante `moduleTitles` en `src/App.jsx`:
   ```javascript
   finance: 'Control Financiero & Presupuestos'
   ```
5. **Renderizar en el Viewport**: Dentro del contenedor de contenido principal en `src/App.jsx`, añade la condición de render:
   ```javascript
   {activeModule === 'finance' && (
     <FinanceModule data={financeData} setData={setFinanceData} showToast={showToast} />
   )}
   ```

### B. Cómo Agregar un Nuevo Manual
La biblioteca de manuales cuenta con un formulario directo en la interfaz de usuario del **Módulo 5** que te permite añadir manuales en caliente. Si deseas agregar uno "de fábrica" en el código fuente:
- Ve a [src/components/ManualsModule.jsx](file:///src/components/ManualsModule.jsx).
- Añade un objeto al arreglo `defaultManuals`:
  ```javascript
  {
    id: 'm-nuevo',
    category: 'Nutrición',
    title: 'Protocolo de Ayuno Intermitente',
    content: '• **Paso 1:** ... \n• **Paso 2:** ...'
  }
  ```

### C. Cómo Agregar un Producto al Comparador
El **Módulo 2** provee un formulario para registrar insumos y añadir establecimientos en caliente. Si deseas configurar uno por defecto:
- Ve a [src/App.jsx](file:///src/App.jsx) y edita la constante `initialHousehold`.
- Sigue la interfaz `HouseholdItem` descrita en los requisitos.

### D. Cómo Actualizar el Peso y la Hidratación
- La aplicación implementa el cálculo dinámico `Peso (kg) * 35 ml` para la meta de agua.
- El usuario puede editar su peso en cualquier momento en el **Módulo 1**. El estado `weight` se actualizará, lo que recalculará automáticamente la hidratación necesaria en todo el sistema (incluyendo el widget del menú lateral).

---

## 3. Guía de Despliegue Paso a Paso

Esta aplicación está lista para producción. Puedes desplegarla gratuitamente en Vercel o Netlify en menos de 2 minutos.

### Opción A: Despliegue en Vercel

#### Método 1: Vercel CLI (Línea de Comandos)
1. Instala el CLI de Vercel globalmente si no lo tienes:
   ```bash
   npm install -g vercel
   ```
2. Ejecuta el comando de login en tu terminal:
   ```bash
   vercel login
   ```
3. Posiciónate en la carpeta raíz del proyecto (`EstiloVida`) y ejecuta:
   ```bash
   vercel
   ```
4. Sigue las instrucciones interactivas:
   - *Set up and deploy?* **Yes**
   - *Link to existing project?* **No**
   - *What's your project's name?* **aura-nexus**
   - *In which directory is your code located?* **./**
   - *Want to modify settings?* **No** (Vercel detecta Vite automáticamente y configura la compilación en `npm run build` apuntando al directorio de salida `dist`).

#### Método 2: Importar desde GitHub/GitLab
1. Sube tu código a un repositorio de GitHub.
2. Inicia sesión en [vercel.com](https://vercel.com).
3. Haz clic en **Add New** > **Project**.
4. Importa el repositorio del proyecto.
5. Vercel autodetectará la configuración de **Vite**. Deja los valores por defecto y haz clic en **Deploy**.

---

### Opción B: Despliegue en Netlify

#### Método 1: Arrastrar y Soltar (Manual rápido)
1. Genera los archivos compilados de producción ejecutando:
   ```bash
   npm run build
   ```
2. Esto creará una carpeta llamada `dist` en la raíz de tu proyecto.
3. Inicia sesión en [netlify.com](https://www.netlify.com).
4. Ve a la sección **Sites** y desplázate hacia abajo hasta encontrar el recuadro para arrastrar archivos.
5. Arrastra la carpeta `dist` directamente al recuadro. ¡Tu sitio estará en línea de inmediato!

#### Método 2: Git Continuo (Recomendado)
1. Inicia sesión en Netlify.
2. Haz clic en **Add new site** > **Import an existing project**.
3. Conéctate con tu proveedor de Git (GitHub).
4. Selecciona tu repositorio.
5. En la configuración de construcción, asegúrate de que:
   - **Build Command**: `npm run build`
   - **Publish directory**: `dist`
6. Haz clic en **Deploy Site**.
