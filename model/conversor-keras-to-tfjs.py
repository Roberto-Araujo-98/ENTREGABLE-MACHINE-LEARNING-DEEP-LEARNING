
import tensorflow as tf
import tensorflowjs as tfjs

# 2. Cargar tu modelo desde el archivo .keras
model = tf.keras.models.load_model('modelo_digitos.')

# 3. Exportar a formato compatible con JavaScript (genera la carpeta tfjs_model)
tfjs.converters.save_keras_model(model, 'tfjs_model')

print("¡Conversión exitosa! Los archivos web se guardaron en la carpeta 'tfjs_model'")