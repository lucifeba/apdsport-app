# ⚡ APD Sport — App de Entrenamiento y Nutrición

Aplicación web progresiva (PWA) para la comunicación entre entrenador-nutricionista y clientes deportivos.

## 🔐 Credenciales de administrador
```
Email: admin@apdsport.com
Contraseña: APD2026!Sport
```

## 🚀 DESPLIEGUE RÁPIDO (5 minutos)

### Opción A: Vercel (Recomendado — GRATIS)

1. **Crea una cuenta en GitHub**: https://github.com/signup
2. **Crea un repositorio nuevo**: https://github.com/new
   - Nombre: `apdsport-app`
   - Público o Privado
3. **Sube los archivos**:
   ```bash
   cd apdsport-app
   git init
   git add .
   git commit -m "APD Sport app inicial"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/apdsport-app.git
   git push -u origin main
   ```
4. **Despliega en Vercel**:
   - Ve a https://vercel.com y regístrate con tu cuenta de GitHub
   - Click en "New Project"
   - Importa tu repositorio `apdsport-app`
   - Framework: Create React App
   - Click en "Deploy"
   - En ~60 segundos tendrás tu URL: `https://apdsport-app.vercel.app`

### Opción B: Netlify (También GRATIS)

1. Ve a https://app.netlify.com
2. Arrastra la carpeta `build/` (después de ejecutar `npm run build`)
3. Listo — te da una URL pública automática

## 📱 INSTALAR COMO APP EN MÓVIL

### iPhone (Safari):
1. Abre el enlace en Safari
2. Pulsa el icono de compartir (cuadrado con flecha)
3. Selecciona "Añadir a pantalla de inicio"
4. Se instala como una app con icono propio

### Android (Chrome):
1. Abre el enlace en Chrome
2. Aparecerá un banner "Instalar APD Sport"
3. O bien: Menú ⋮ → "Instalar aplicación"
4. Se instala como app nativa

## 🏗️ DESARROLLO LOCAL

```bash
# Instalar dependencias
npm install

# Iniciar en desarrollo
npm start
# → Abre http://localhost:3000

# Compilar para producción
npm run build
```

## 📋 Funcionalidades

### Panel de Cliente
- ✅ Chat en tiempo real con el entrenador
- ✅ Formulario de modificación de entrenamiento
- ✅ Feedback semanal (4 pasos: físico, nutrición, entreno, valoración)
- ✅ Exportar historial de progreso
- ✅ Notificaciones de actividad

### Panel de Administrador (Pablo)
- ✅ Dashboard con estadísticas y alertas
- ✅ Gestión completa de clientes
- ✅ Chat individual con cada cliente
- ✅ Mensajes de difusión masiva
- ✅ Visualización de feedbacks y métricas

### Autenticación
- ✅ Registro de nuevos usuarios
- ✅ Login con credenciales
- ✅ Recuperación de contraseña
- ✅ Sesión persistente (localStorage)

## 🎨 Branding
- Negro (#0A0A0A) — fondo principal
- Verde eléctrico (#00E676) — acento principal
- Naranja (#FF6D00) — acento secundario
- Tipografía: Outfit (Google Fonts)
