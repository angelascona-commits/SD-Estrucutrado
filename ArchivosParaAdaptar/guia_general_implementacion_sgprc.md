# Guía General de Implementación: Dominio de Gestión de Permisos y Recursos Cloud (SGPRC)

## 1. Contexto Arquitectónico y Estrategia de Integración
Este sistema se estructurará como un **nuevo dominio independiente** dentro de la arquitectura modular y desacoplada ya existente. 

* **Persistencia y Acceso:** Se integrará sobre la base de datos centralizada de **Supabase**.
* **Recursos Compartidos:** Compartirá de forma exclusiva la gestión de usuarios (`auth.users` o la tabla pública central del ecosistema) y el acceso a los catálogos maestros globales (como la lista de áreas o de entornos).
* **Autonomía:** Toda la lógica de negocio, flujos de estados, orquestación de correos e interfaces específicas serán completamente nuevas y exclusivas de este dominio, manteniendo un acoplamiento mínimo (únicamente a nivel de IDs de usuarios y catálogos).

---

## 2. Objetivo del Dominio
El SGPRC actuará como un **puente de traducción y orquestación técnica**. Su propósito fundamental es capturar las necesidades comerciales planteadas por las proyectistas (quienes conocen el negocio pero no la tecnología) y permitir que el equipo técnico (DM) las traduzca en componentes exactos de la nube (IAM, bases de datos, APIs, servidores). 

A partir de ahí, el sistema automatizará todo el flujo de revisiones y aprobaciones con el cliente final mediante interacciones directas por correo electrónico, eliminando la dependencia de cadenas de mails sueltos o archivos Excel tradicionales, garantizando la trazabilidad absoluta exigida por normativas de auditoría internacional (ISO).

---

## 3. Actores, Perfiles y Roles del Dominio

1. **El Orquestador Técnico (Rol: DM / Tu Equipo)**
   * **Perfil:** Domina el negocio, la infraestructura y la seguridad del ecosistema.
   * **Función:** Es el usuario e intermediario principal del sistema. Recibe la necesidad puntual de las proyectistas de Protecta (Gianella en SOAT, Héctor en Técnica, Melary, Miriam, Elizabeth, Araceli, etc.) y abre formalmente el ticket en la plataforma.
   * **Acción:** Traduce la meta comercial a componentes Cloud precisos (especificando cuentas, servicios, eventos) y añade el sustento técnico que justifica la petición.

2. **El Evaluador (Rol: Infraestructura / Manantial / TI Protecta)**
   * **Perfil:** TI de Protecta apoyado por Manantial como socio tecnológico neutral que actúa como segunda opinión técnica y encargado de pases a Producción.
   * **Función:** Evalúa la viabilidad de recursos y capacidades financieras de la solicitud.
   * **Acción:** Define o valida el presupuesto asignado, determina con qué sistemas o APIs existentes del ecosistema se integrará el nuevo recurso y otorga la pre-aprobación técnica.

3. **El Auditor y Aprobador Final (Rol: Ciberseguridad)**
   * **Perfil:** Área de seguridad de Protecta enfocada en elevar los estándares hacia la certificación ISO.
   * **Función:** Mitigar riesgos en el entorno de producción controlando el tráfico y el perímetro.
   * **Acción:** Evalúa las integraciones propuestas desde una perspectiva estricta de riesgos. Registra barreras de control (listas blancas, listas negras, firewalls), define los límites de peticiones permitidas y otorga el "OK" final e inmutable para el acceso o despliegue.

---

## 4. Flujo de Automatización de Correos (Envío y Recepción)
El núcleo de la solución radica en que el cliente final (Infraestructura y Ciberseguridad) interactúe con el dominio de forma asíncrona y ágil, utilizando su bandeja de correo electrónico institucional sin la obligación de loguearse recurrentemente en la plataforma web.

### 4.1 Envío de Notificaciones (Outbound)
* **Gatillo (Trigger):** Cada cambio de estado relevante en el ciclo de vida del ticket (ej. de `Borrador` a `Pendiente Infraestructura`, o de este a `Pendiente Ciberseguridad`) dispara de forma automática un evento en la base de datos que invoca una función del backend (*Supabase Edge Function*).
* **Estructura del Email:** La función despacha un correo en formato HTML limpio y profesional a los encargados del área correspondiente. Este correo contiene un cuadro resumen con los datos de la proyectista, la necesidad del negocio, el sustento técnico detallado por DM y metadatos ocultos en las cabeceras del correo (como el ID del ticket).
* **Interactividad:** El cuerpo del mensaje incluye botones web prominentes para realizar acciones inmediatas (Aprobar / Rechazar).

### 4.2 Recepción y Procesamiento de Respuestas (Inbound)
El sistema puede configurarse bajo dos enfoques de automatización para capturar la decisión del aprobador:

* **Estrategia A: Mediante Enlaces Firmados (Magic Links):**
  * Al hacer clic en el botón "Aprobar" del correo, el usuario es redirigido a una URL única que expone un token criptográfico seguro y temporal.
  * La función del backend intercepta la petición, valida la autenticidad y vigencia del token, cambia el estado del ticket en la base de datos, registra el log de auditoría y muestra una pantalla web minimalista que confirma el éxito de la operación.
  * Si hace clic en "Rechazar", lo redirige a un formulario web simple de una sola caja de texto para recolectar obligatoriamente el motivo del rechazo.

* **Estrategia B: Mediante Respuesta Directa al Correo (Inbound Parse):**
  * El aprobador simplemente presiona "Responder" en su cliente de correo tradicional y escribe su decisión en texto plano (ej. *"Aprobado, proceder con el pase"* o *"Rechazado por falta de presupuesto"*).
  * El proveedor de correos captura la respuesta entrante, la transforma en un formato estructurado (JSON) y la envía al backend del dominio.
  * El sistema identifica automáticamente a qué ticket pertenece la respuesta (leyendo el asunto o las cabeceras ocultas), valida que el remitente tenga permisos vigentes para ese flujo y aplica expresiones regulares en el texto para determinar si fue una aprobación o un rechazo, extrayendo los comentarios adicionales para guardarlos como sustento.

---

## 5. Requerimientos Funcionales (RF)

### 5.1 Módulo de Gestión de Solicitudes
* **RF-01:** Permite al Orquestador Técnico iniciar un ticket asociando a la proyectista solicitante, detallando la necesidad de negocio del área de origen (Técnica, Comercial, Marketing, SOAT, etc.) y redactando el sustento técnico de ingeniería.
* **RF-02:** El formulario del ticket debe permitir la selección múltiple de componentes y permisos de la nube requeridos, segmentando por el entorno destino (Desarrollo, QA, Producción).
* **RF-03:** Capacidad para adjuntar diagramas de arquitectura, manuales o documentos de soporte técnico que queden vinculados al histórico del caso.

### 5.2 Módulo de Ciclo de Vida y Estados
* **RF-04:** El ticket debe avanzar de forma estricta por los siguientes estados: `Borrador` -> `Pendiente Infraestructura` -> `Pendiente Ciberseguridad` -> `Aprobado` o `Rechazado`.
* **RF-05:** Automatización del envío de alertas por correo electrónico hacia los evaluadores y aprobadores según el estado en el que se encuentre el flujo.
* **RF-06:** Obligatoriedad de registrar un comentario detallado de retroalimentación cada vez que un recurso sea marcado en estado `Rechazado`.

### 5.3 Módulo de Evaluaciones Especializadas
* **RF-07:** Habilitar campos exclusivos para el área de Infraestructura (TI Protecta) donde documenten el presupuesto estimado del recurso y definan de forma explícita el mapa de interconexión (sistemas con los que se integrará el nuevo componente).
* **RF-08:** Habilitar campos exclusivos para el área de Ciberseguridad donde dejen constancia de las reglas perimetrales aplicadas: IPs permitidas/denegadas (Listas Blancas/Negras), reglas de Firewall y configuraciones de umbrales máximos de tráfico o cantidad de peticiones.

### 5.4 Módulo de Auditoría ISO y Trazabilidad
* **RF-09:** El dominio debe registrar un historial inmutable de auditoría (Log). Cada vez que ocurra un cambio de estado o una edición, se guardará la fecha, hora exacta, el ID del usuario ejecutor y la descripción de la acción.
* **RF-10:** El sistema debe proveer tableros de consulta rápida y exportación de reportes unificados que listen los permisos activos por componente o usuario, listos para ser presentados ante auditorías internas o externas de certificación ISO.

---

## 6. Requerimientos No Funcionales (RNF)

* **RNF-01 (Seguridad a nivel de Base de Datos):** Implementación estricta de políticas de seguridad por filas (Row Level Security - RLS) para garantizar que los datos del dominio solo sean accesibles o modificables por los perfiles correctos de la organización.
* **RNF-02 (Gestión Asíncrona de Correos):** El backend debe acoplarse con un proveedor externo robusto (ej. Resend, SendGrid, AWS SES) para procesar de forma ágil los webhooks y reintentos automáticos de correos entrantes y salientes.
* **RNF-03 (Usabilidad del Orquestador):** La interfaz para el equipo técnico debe consistir en un panel visual centralizado (tipo Kanban o listado dinámico con filtros) que identifique claramente los cuellos de botella y determine en qué área (Infraestructura o Ciberseguridad) se encuentra estancado cada requerimiento.

---

## 7. Modelo Conceptual de Datos (Estructura de Entidades)
*Nota para el análisis del Agente de IA: Diseñar el esquema relacional en base a estas entidades conceptuales, considerando que se vinculan con la gestión de usuarios existente en el Core.*

1. **Entidad: Solicitudes (Tickets)**
   * Atributos: Identificador único, Identificador del orquestador (vínculo a usuarios), Nombre de la proyectista de Protecta, Descripción detallada del negocio, Sustento técnico de ingeniería, Estado actual del flujo, Fecha de creación y Fecha de última actualización.

2. **Entidad: Componentes Cloud**
   * Atributos: Identificador único, Vínculo a la solicitud madre, Servicio técnico requerido (asociado a catálogos maestros compartidos), Tipo de entorno (Dev, QA, Prod), Configuración y detalles técnicos específicos.

3. **Entidad: Evaluaciones Técnicas**
   * Atributos: Identificador único, Vínculo a la solicitud madre, Identificador del evaluador de Infraestructura, Presupuesto económico, Detalle técnico de integraciones y conexiones, Identificador del aprobador de Ciberseguridad, Reglas específicas de control perimetral (listas, firewalls, límites de peticiones) y comentarios adicionales de bloqueo o aprobación.

4. **Entidad: Historial de Auditoría (Logs)**
   * Atributos: Identificador único, Vínculo a la solicitud madre, Identificador del usuario que realiza el cambio, Acción ejecutada y Marca de tiempo inmutable (Fecha/Hora).

5. **Entidad: Control de Tokens de Correo**
   * Atributos: Identificador único, Vínculo a la solicitud madre, Identificador del usuario destinatario, Token de seguridad encriptado (hash), Acción para la que fue emitido (Aprobar/Rechazar), Fecha de expiración y Estado de uso (booleano).

---

## 8. Reglas de Negocio Críticas (Enfoque ISO)
* **Principio de No Repudio:** Toda aprobación o rechazo que provenga de un correo electrónico o un enlace temporal debe vincularse obligatoriamente al ID de usuario del aprobador responsable en la bitácora de auditoría.
* **Ciclo de Vida de Seguridad del Token:** Los tokens de aprobación enviados por correo tendrán una vigencia máxima improrrogable de 48 horas. Una vez utilizados, deben quedar inmediatamente inactivos para prevenir ataques de duplicidad o alteraciones de flujo.
