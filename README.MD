### 1. Introducción y Arquitectura General del Sistema

El pipeline analítico y computacional desarrollado sigue el siguiente flujo estructurado:

```text
       [ Dataset MNIST (70,000 Muestras / 784 Píxeles / 28x28) ]
                                   |
                                   v
             [ OpenML / NumPy (Carga y Validación Matricial) ]
                                   |
                                   v
          [ Preprocesamiento & Normalización (Escalado / 255.0) ]
                                   |
                                   v
      +----------------------------+----------------------------+
      |                                                         |
      v                                                         v
[ Modelado ML Tradicional ]                       [ Modelado Deep Learning ]
(Scikit-Learn: KNN vs. Árbol)                     (TensorFlow/Keras: CNN Conv2D)
      |                                                         |
      +----------------------------+----------------------------+
                                   |
                                   v
                 [ Evaluación & Visualización Final ]
     (Accuracy >99%, Matriz de Confusión, Inferencia Dígito Único)