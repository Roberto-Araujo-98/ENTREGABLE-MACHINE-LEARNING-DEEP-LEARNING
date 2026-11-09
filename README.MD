# TecnoForms — Clasificación de Dígitos Manuscritos con Deep Learning (CNN & TensorFlow.js)

- **Demo Interactiva (GitHub Pages):** [Probar Clasificador en Vivo](https://roberto-araujo-98.github.io/ENTREGABLE-MACHINE-LEARNING-DEEP-LEARNING/)

**Institución:** SENATI

**Carrera:** Ingeniería de Software con Inteligencia Artificial

**Proyecto Entregable:** Aprendizaje Supervisado y Redes Neuronales Convolucionales (CNN)

**Empresa:** TecnoForms

## 📄 Descripción del Proyecto

El sistema de **TecnoForms** automatiza la lectura y clasificación de dígitos manuscritos procesados desde formularios físicos escaneados. El proyecto combina un flujo de trabajo completo de Machine Learning y Deep Learning en Python (**Scikit-Learn** vs **TensorFlow/Keras**) con un motor de inferencia en tiempo real desplegado completamente en el navegador web mediante **TensorFlow.js**.

## 📁 Estructura del Repositorio

```
ENTREGABLE-MACHINE-LEARNING-DEEP-LEARNING/
│
├── css/
│   └── style.css                 # Estilos visuales del cliente web (Cyberpunk Neon)
├── js/
│   ├── app.js                    # Inferencia de TF.js, eventos de canvas y centro de masa
│   ├── model-data.js             # Arquitectura y pesos incrustados (Bypass CORS para file://)
│   └── tailwind-config.js        # Configuración de paleta de estilos Tailwind
├── model/                        # Carpeta de respaldo (model.json y .bin originales)
├── old/
│   └── tecnoforms_neural_engine.html # Prototipo monolítico anterior
├── index.html                    # Interfaz principal de usuario
├── README.md                     # Documentación técnica del repositorio
└── trabajo_final_ml_dl.ipynb     # Cuaderno Jupyter con la pipeline completa de entrenamiento
```

## 🛠️ Modificaciones y Optimizaciones Técnicas

### 1. Incrustación del Modelo en JavaScript (`js/model-data.js`)

* **Solución a Restricciones CORS (`file://`):** Para evitar que los navegadores bloqueen la lectura de archivos binarios externos (`.bin`) al abrir la aplicación localmente mediante doble clic, se empaquetó la arquitectura y los pesos directamente dentro de un archivo JavaScript (`js/model-data.js`).
* **Ejecución Directa sin Servidor:** Ya no es estrictamente necesario levantar un servidor local (`python -m http.server`). Simplemente puedes abrir el archivo `index.html` haciendo doble clic desde cualquier explorador de archivos.
* **Verificación de Rendimiento:** Probado exitosamente con trazos libres de los dígitos $0$, $1$ y $7$ mediante mouse y plantillas de prueba, manteniendo una precisión idéntica al modelo original entrenado en Python.

### 2. Arquitectura de la CNN y Conversión

* **Estructura del Modelo:** 
  $$\text{Input}(28 \times 28 \times 1) \rightarrow \text{Conv2D}(32, 3\times3) \rightarrow \text{MaxPool2D} \rightarrow \text{Conv2D}(64, 3\times3) \rightarrow \text{MaxPool2D} \rightarrow \text{Flatten} \rightarrow \text{Dense}(128) \rightarrow \text{Dropout}(0.4) \rightarrow \text{Dense}(10, \text{Softmax})$$

* **Validación de Ponderaciones:** Se aseguró una discrepancia mínima imperceptible ($\approx 7 \times 10^{-8}$) al contrastar los cálculos matriciales en NumPy frente al motor de inferencia en JavaScript.

### 3. Preprocesamiento por Centro de Masa (Center of Mass Normalization)

* El algoritmo calcula el centroide de intensidad del trazo en el canvas:
  $$C_x = \frac{\sum x \cdot I(x,y)}{\sum I(x,y)}, \quad C_y = \frac{\sum y \cdot I(x,y)}{\sum I(x,y)}$$
* Esto alinea geométricamente el dígito exactamente bajo los estándares del dataset **MNIST**, maximizando la tasa de acierto del modelo en tiempo real.

## 🚀 Cómo Ejecutar la Aplicación Web

Gracias a la integración de `js/model-data.js`, la ejecución local se ha simplificado al máximo:

1. **Sin Servidor (Requerimiento básico: Conexión a Internet para CDNs de Tailwind/TF.js):**
   * Haz doble clic directamente sobre el archivo **`index.html`** en tu explorador de archivos. El modelo cargará de forma instantánea.
2. **Método Alternativo con Servidor Local (Python):**
   * Si prefieres usar un entorno de servidor estático, abre tu terminal en la raíz del proyecto y ejecuta:
     ```bash
     python -m http.server 8000
     ```
   * Accede desde tu navegador en: `http://localhost:8000`

> **Nota:** La carpeta `model/` se mantiene en el repositorio como respaldo histórico. Si en el futuro deseas actualizar el modelo con nuevos entrenamientos, puedes regenerar `js/model-data.js` o utilizar el botón de carga manual integrado en la interfaz web.

## 📊 Métricas de Rendimiento Comparativo

| Modelo / Algoritmo | Framework | Muestras de Test | Accuracy / Precisión |
| :--- | :--- | :--- | :--- |
| **Árbol de Decisión** | Scikit-Learn | 14,000 | $\sim 87.40\%$ |
| **K-Nearest Neighbors (KNN)** | Scikit-Learn | 3,000 | $\sim 96.80\%$ |
| **Red Neuronal Convolucional (CNN)** | TensorFlow.js / Python | 14,000 | **> 99.00%** |