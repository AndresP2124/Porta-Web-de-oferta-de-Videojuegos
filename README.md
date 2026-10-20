# Games For The Broke - Monitor de Ofertas Digitales y Telemetría HTTP

**Asignatura:** Diseño de Sistemas en Internet  
**Nivel Académico:** Cuarto Año de Ingeniería en Sistemas  
**Arquitectura:** Cliente Web HTTP RESTful con JavaScript Nativo (ES6+)  
**Servicio Web Consumido:** CheapShark Public REST API v1.0  

---

## 1. Propósito Académico yAlcance del Proyecto

El presente proyecto consiste en el diseño e implementación de un portal web interactivo tipo panel de control (Application Shell Dashboard) orientado a la consulta, filtrado y auditoría en tiempo real de ofertas de videojuegos digitales para PC a través de múltiples plataformas de distribución (Steam, GOG, Epic Games Store, Humble Store, entre otras).

Desde la perspectiva de la ingeniería de sistemas en Internet, el objetivo central de la aplicación trasciende la visualización de un catálogo comercial: el portal ha sido instrumentado como un cliente de diagnóstico HTTP capaz de evidenciar en tiempo real el ciclo de vida de las peticiones de red. La solución demuestra de forma práctica y coexistente el uso de Promesas tradicionales y funciones asíncronas modernas, el cálculo de latencia de transporte con precisión de sub-milisegundos, la validación estricta de códigos de estado del protocolo HTTP, la tolerancia a fallos mediante un algoritmo de reintento automático con espera progresiva y la manipulación segura del Árbol del Modelo de Objetos del Documento (DOM).

---

## 2. Arquitectura del Directorio y Separación de Responsabilidades

El repositorio aplica el principio de Separación de Responsabilidades (Separation of Concerns) tanto en el diseño del software como en la organización física del sistema de archivos, cumpliendo con los estándares de despliegue en servidores web HTTP:

```text
Games-For-The-Broke/
├── css/
│   └── styles.css
├── js/
│   └── app.js
├── index.html
└── README.md