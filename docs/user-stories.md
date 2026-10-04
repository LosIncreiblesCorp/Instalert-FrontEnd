# User Stories

## Sprint 1

### Overview
This document contains the Sprint 1 user stories and requirement traceability for the InstAlert application.

### Requirement Traceability Matrix (RTM)

| User Story | Bounded Context | Implemented Elements |
|:-----------|:----------------|:---------------------|
| **US05: Invitar a un empleado** | Business | `InvitationForm`, `BusinessStore`, `BusinessApi`, `StaffInvitationAssembler`, `StaffInvitation` |
| **US06: Cancelar una invitación** | Business | `PersonnelList`, `BusinessStore`, `BusinessApi`, `StaffInvitationAssembler`, `StaffInvitation` |
| **US07: Consultar empleados** | Business | `PersonnelList`, `BusinessStore`, `BusinessApi`, `BusinessMemberAssembler`, `BusinessMember` |
| **US08: Activar o desactivar la membresía de un empleado** | Business | `PersonnelList`, `BusinessStore`, `BusinessApi`, `BusinessMemberAssembler`, `BusinessMember` |
| **US09: Editar los datos de un empleado** | Business | `PersonnelList`, `BusinessStore`, `BusinessApi`, `BusinessMemberAssembler`, `StaffInvitationAssembler` |
| **US11: Consultar invitaciones** | Business | `PersonnelList`, `BusinessStore`, `BusinessApi`, `StaffInvitationAssembler`, `StaffInvitation` |
| **US12: Reenviar una invitación pendiente** | Business | `PersonnelList`, `BusinessStore`, `BusinessApi`, `StaffInvitationAssembler`, `StaffInvitation` |
| **US41: Consultar los cupos del plan** | Business | `PersonnelList`, `InvitationForm`, `BusinessStore`, `BusinessApi`, `Subscription`, `Plan` |
| **US13: Activar el botón de pánico** | Alert | `EmployeeAlerts`, `AlertStore`, `AlertApi`, `AlertRecordAssembler`, `AlertRecord`, `AlertPreferences` |
| **US14: Reportar una actividad sospechosa** | Alert | `EmployeeAlerts`, `AlertStore`, `AlertApi`, `AlertRecordAssembler`, `AlertRecord` |
| **US15: Reportar un evento pasado** | Alert | `EmployeeAlerts`, `AlertStore`, `AlertApi`, `AlertRecordAssembler`, `AlertRecord` |
| **US16: Reportar una condición de riesgo** | Alert | `EmployeeAlerts`, `AlertStore`, `AlertApi`, `AlertRecordAssembler`, `AlertRecord` |
| **US44: Completar un reporte después de resolver una alerta** | Alert | `EmployeeAlerts`, `AlertStore`, `AlertApi`, `AlertRecordAssembler`, `AlertRecord` |
| **US19: Consultar el historial de alertas** | Alert | `EmployeeAlerts`, `AlertStore`, `AlertApi`, `AlertRecordAssembler`, `AlertRecord`, `router` |
| **US22: Consultar incidentes por zona** | Mapping | `RiskMapPage`, `RiskMap`, `TacticalInspector`, `MappingStore`, `MappingApi`, `RiskZoneAssembler`, `IncidentMarkerAssembler`, `RiskZone`, `IncidentMarker` |
| **US23: Consultar el detalle de un incidente** | Mapping | `TacticalInspector`, `MappingStore`, `IncidentMarker` |
| **US24: Filtrar el mapa** | Mapping | `RiskMapPage`, `RiskMap`, `MappingStore`, `IncidentMarker` |
| **US26: Seleccionar un plan de suscripción** | Payments | `SubscriptionPage`, `PlanCard`, `PaymentsStore`, `PaymentsApi`, `PlanAssembler`, `Plan`, `PaymentsFormat` |
| **US45: Consultar el estado de la suscripción** | Payments | `SubscriptionPage`, `SubscriptionSummary`, `PaymentsStore`, `PaymentsApi`, `SubscriptionAssembler`, `Subscription` |
| **US42: Cambiar el plan de suscripción** | Payments | `SubscriptionPage`, `PlanCard`, `PaymentsStore`, `PaymentsApi`, `SubscriptionAssembler`, `Subscription`, `Plan` |
| **US27: Cancelar una suscripción** | Payments | `SubscriptionPage`, `SubscriptionSummary`, `PaymentsStore`, `PaymentsApi`, `SubscriptionAssembler`, `Subscription` |
| **US30: Añadir un contacto de emergencia** | Contacts | `ContactForm`, `ContactsStore`, `ContactsApi`, `EmergencyContactAssembler`, `EmergencyContact` |
| **US31: Editar un contacto de emergencia** | Contacts | `ContactForm`, `ContactsList`, `ContactsStore`, `ContactsApi`, `EmergencyContactAssembler`, `EmergencyContact` |
| **US32: Eliminar un contacto de emergencia** | Contacts | `ContactsList`, `ContactsStore`, `ContactsApi`, `EmergencyContactAssembler`, `EmergencyContact` |
| **US39: Configurar preferencias de notificación** | Alert | `EmployeeAlerts`, `AlertStore`, `AlertApi`, `AlertPreferences` |
| **TS-01: Endpoint para registrar alertas e incidentes** | Alert | `AlertApi`, `BaseApi`, `BaseEndpoint`, `server/db.json: alerts` |
| **TS-02: Endpoint para consultar alertas e incidentes** | Alert | `AlertApi`, `BaseApi`, `BaseEndpoint`, `server/db.json: alerts` |
| **TS-04: Endpoint para consultar el mapa de riesgo** | Mapping | `MappingApi`, `BaseApi`, `BaseEndpoint`, `server/db.json: risk_zones, incidents, businesses` |
| **TS-05: Endpoints para gestionar contactos de emergencia** | Contacts | `ContactsApi`, `BaseApi`, `BaseEndpoint`, `server/db.json: emergency-contacts` |
| **TS-06: Endpoints para gestionar notificaciones y preferencias** | Alert | `AlertApi`, `BaseApi`, `BaseEndpoint`, `server/db.json: alertPreferences` |
| **TS-07: Endpoints para consultar planes y gestionar suscripciones** | Payments | `PaymentsApi`, `BusinessApi`, `BaseApi`, `BaseEndpoint`, `server/db.json: plans, subscriptions` |

## US05: Invitar a un empleado

**Description:** Como administrador, quiero invitar a un empleado para incorporarlo a mi comercio.

### Acceptance Criteria

#### Scenario 1: Invitación con cupo disponible
Dado que el plan tiene un cupo disponible
Cuando ingreso el nombre y correo del empleado y envío la invitación
Entonces el sistema crea una cuenta temporal, genera una contraseña temporal, registra la invitación pendiente y reserva un cupo.

#### Scenario 2: Sin cupos disponibles
Dado que los cupos del plan están ocupados o reservados por invitaciones pendientes
Cuando intento invitar a otro empleado
Entonces el sistema no crea otra invitación.

## US06: Cancelar una invitación

**Description:** Como administrador, quiero cancelar una invitación pendiente para detener su proceso de incorporación.

### Acceptance Criteria

#### Scenario 1: Cancelación de invitación pendiente
Dado que una invitación pendiente reserva un cupo
Cuando la cancelo
Entonces el sistema cambia su estado a cancelada y libera el cupo inmediatamente.

#### Scenario 2: Invitación aceptada
Dado que el empleado ya aceptó la invitación
Cuando intento cancelarla como invitación
Entonces el sistema informa que debo gestionar la membresía del empleado.

## US07: Consultar empleados

**Description:** Como administrador, quiero consultar la lista de empleados de mi comercio para conocer el estado de sus membresías.

### Acceptance Criteria

#### Scenario 1: Lista con empleados
Dado que mi comercio tiene empleados registrados
Cuando consulto la lista
Entonces el sistema los muestra e indica cuáles tienen una membresía activa o inactiva.

#### Scenario 2: Lista vacía
Dado que mi comercio no tiene empleados registrados
Cuando consulto la lista
Entonces el sistema indica que todavía no hay empleados.

## US08: Activar o desactivar la membresía de un empleado

**Description:** Como administrador, quiero activar o desactivar la membresía de un empleado para gestionar los cupos del plan y su relación con mi comercio.

### Acceptance Criteria

#### Scenario 1: Desactivar y liberar cupo
Dado que el plan de 4 empleados está ocupado por cuatro empleados activos
Cuando desactivo la membresía de uno
Entonces quedan tres empleados activos y un cupo disponible.

#### Scenario 2: Activar con cupo disponible
Dado que hay una membresía inactiva y el plan tiene un cupo libre
Cuando la activo
Entonces el sistema la marca activa y ocupa ese cupo.

#### Scenario 3: Activar sin cupo disponible
Dado que todos los cupos están ocupados o reservados
Cuando intento activar otra membresía
Entonces el sistema no permite exceder el límite del plan.

## US09: Editar los datos de un empleado

**Description:** Como administrador, quiero editar el nombre o correo de un empleado para corregir sus datos.

### Acceptance Criteria

#### Scenario 1: Actualización válida
Dado que el empleado tiene datos registrados
Cuando guardo un nombre o correo válido
Entonces el sistema actualiza sus datos.

#### Scenario 2: Correo inválido
Dado que ingreso un correo con formato no válido
Cuando intento guardar el cambio
Entonces el sistema solicita corregirlo y conserva el correo anterior.

#### Scenario 3: Invitación pendiente
Dado que el empleado todavía tiene una invitación pendiente
Cuando actualizo su nombre o correo
Entonces el sistema conserva el estado de la invitación y el mismo cupo reservado.

## US11: Consultar invitaciones

**Description:** Como administrador, quiero consultar las invitaciones de mi comercio para conocer su estado.

### Acceptance Criteria

#### Scenario 1: Invitaciones registradas
Dado que mi comercio ha enviado invitaciones
Cuando consulto la lista
Entonces el sistema muestra cada invitación con su estado actual.

#### Scenario 2: Sin invitaciones
Dado que mi comercio no ha enviado invitaciones
Cuando consulto la lista
Entonces el sistema indica que no hay invitaciones para mostrar.

## US12: Reenviar una invitación pendiente

**Description:** Como administrador, quiero reenviar una invitación pendiente para que el empleado pueda completar su incorporación.

### Acceptance Criteria

#### Scenario 1: Reenvío pendiente
Dado que existe una invitación pendiente
Cuando la reenvío
Entonces el sistema reenvía la misma invitación y mantiene reservado el mismo cupo.

#### Scenario 2: Invitación no pendiente
Dado que una invitación está aceptada o cancelada
Cuando intento reenviarla
Entonces el sistema no la reenvía y muestra su estado.

## US41: Consultar los cupos del plan

**Description:** Como administrador, quiero consultar los cupos del plan de mi comercio para saber cuántos están ocupados, reservados y disponibles.

### Acceptance Criteria

#### Scenario 1: Consultar el desglose de cupos
Dado que mi comercio tiene empleados activos e invitaciones pendientes
Cuando consulto los cupos del plan
Entonces el sistema muestra el límite del plan y la cantidad de cupos ocupados, reservados y disponibles.

#### Scenario 2: Invitación aceptada
Dado que una invitación pendiente reserva un cupo
Cuando el empleado completa su registro y acepta la invitación
Entonces el sistema muestra ese cupo como ocupado por un empleado activo y actualiza el desglose.

#### Scenario 3: Sin invitaciones ni empleados
Dado que el plan no tiene empleados activos ni invitaciones pendientes
Cuando consulto sus cupos
Entonces el sistema muestra todos los cupos como disponibles.

## US13: Activar el botón de pánico

**Description:** Como usuario, quiero activar el botón de pánico para avisar de una emergencia.

### Acceptance Criteria

#### Scenario 1: Alerta confirmada
Dado que inicio la cuenta regresiva
Cuando esta termina sin que la cancele
Entonces el sistema registra una alerta activa.

#### Scenario 2: Alerta cancelada
Dado que la cuenta regresiva sigue en curso
Cuando la cancelo
Entonces el sistema no registra la alerta.

## US14: Reportar una actividad sospechosa

**Description:** Como usuario, quiero reportar una actividad sospechosa para compartir información sobre el entorno.

### Acceptance Criteria

#### Scenario 1: Reporte válido
Dado que completo la información requerida y clasifico el reporte
Cuando lo envío
Entonces el sistema registra la alerta y la pone a disposición en la aplicación.

#### Scenario 2: Información incompleta
Dado que falta información obligatoria
Cuando intento enviar el reporte
Entonces el sistema indica qué debo completar.

## US15: Reportar un evento pasado

**Description:** Como usuario, quiero reportar un evento que ya ocurrió para dejar constancia y compartir información.

### Acceptance Criteria

#### Scenario 1: Registro histórico
Dado que indico que el evento ya ocurrió y completo la información requerida
Cuando envío el reporte
Entonces el sistema lo registra como un incidente histórico y no como una alerta activa.

#### Scenario 2: Información incompleta
Dado que falta información obligatoria
Cuando intento enviar el reporte
Entonces el sistema solicita completarla.

## US16: Reportar una condición de riesgo

**Description:** Como usuario, quiero reportar una condición de riesgo para informar sobre peligros del entorno.

### Acceptance Criteria

#### Scenario 1: Riesgo reportado
Dado que describo una condición de riesgo y su ubicación
Cuando envío el reporte
Entonces el sistema registra la información.

#### Scenario 2: Datos insuficientes
Dado que falta información obligatoria
Cuando intento enviar el reporte
Entonces el sistema indica qué debo completar.

## US44: Completar un reporte después de resolver una alerta

**Description:** Como usuario, quiero completar el reporte de una alerta después de resolverla para registrar los detalles del incidente cuando haya terminado el peligro.

### Acceptance Criteria

#### Scenario 1: Completar un reporte pendiente
Dado que una alerta está resuelta y su reporte tiene detalles pendientes
Cuando ingreso y envío la información solicitada
Entonces el sistema completa el reporte asociado y conserva la alerta como resuelta.

#### Scenario 2: Reporte ya completado
Dado que el reporte asociado a la alerta ya fue completado
Cuando intento completarlo nuevamente
Entonces el sistema informa que el reporte ya está finalizado y conserva la información registrada.

## US19: Consultar el historial de alertas

**Description:** Como usuario, quiero consultar el historial para revisar alertas e incidentes anteriores.

### Acceptance Criteria

#### Scenario 1: Historial con registros
Dado que existen reportes anteriores
Cuando consulto el historial
Entonces el sistema muestra los registros y sus estados.

#### Scenario 2: Historial vacío
Dado que no existen reportes anteriores
Cuando consulto el historial
Entonces el sistema indica que no hay información para mostrar.

## US22: Consultar incidentes por zona

**Description:** Como usuario, quiero consultar los incidentes asociados a una zona para conocer los reportes de ese lugar.

### Acceptance Criteria

#### Scenario 1: Zona con incidentes
Dado que selecciono una zona con reportes
Cuando consulto sus incidentes
Entonces el sistema muestra los registros asociados.

#### Scenario 2: Zona sin incidentes
Dado que selecciono una zona sin reportes
Cuando consulto sus incidentes
Entonces el sistema indica que no hay registros para mostrar.

## US23: Consultar el detalle de un incidente

**Description:** Como usuario, quiero consultar el detalle de un incidente para conocer la información registrada.

### Acceptance Criteria

#### Scenario 1: Incidente disponible
Dado que selecciono un incidente existente
Cuando consulto su detalle
Entonces el sistema muestra la información registrada.

#### Scenario 2: Incidente no disponible
Dado que el incidente ya no está disponible
Cuando intento consultar su detalle
Entonces el sistema informa que no puede mostrarlo.

## US24: Filtrar el mapa

**Description:** Como usuario, quiero filtrar la información del mapa para encontrar los reportes que me interesan.

### Acceptance Criteria

#### Scenario 1: Aplicar filtros
Dado que hay reportes en el mapa
Cuando selecciono y aplico filtros disponibles
Entonces el sistema actualiza los resultados según esos criterios.

#### Scenario 2: Limpiar filtros
Dado que hay filtros aplicados
Cuando los limpio
Entonces el sistema vuelve a mostrar los resultados sin esos filtros.

#### Scenario 3: Sin coincidencias
Dado que los criterios seleccionados no coinciden con reportes
Cuando los aplico
Entonces el sistema indica que no hay resultados.

## US26: Seleccionar un plan de suscripción

**Description:** Como administrador, quiero seleccionar un plan para contratar la opción que se ajuste a las necesidades de mi comercio.

### Acceptance Criteria

#### Scenario 1: Consultar planes
Dado que consulto las opciones de suscripción
Cuando el sistema las presenta
Entonces muestra los planes con capacidad para 4, 8 y 15 empleados.

#### Scenario 2: Activar un plan
Dado que selecciono un plan y proporciono un medio de pago válido
Cuando se confirma el pago
Entonces el sistema activa la suscripción con la capacidad correspondiente.

## US45: Consultar el estado de la suscripción

**Description:** Como administrador, quiero consultar el estado de la suscripción de mi comercio para conocer el plan vigente, su periodo y si la cancelación está programada.

### Acceptance Criteria

#### Scenario 1: Suscripción vigente
Dado que mi comercio tiene una suscripción activa
Cuando consulto su estado
Entonces el sistema muestra el plan contratado, el periodo vigente y el estado actual.

#### Scenario 2: Cancelación programada
Dado que solicité cancelar la renovación de mi suscripción
Cuando consulto su estado durante el periodo pagado
Entonces el sistema indica que la suscripción sigue activa hasta el fin del periodo y que la cancelación está programada.

#### Scenario 3: Sin suscripción vigente
Dado que mi comercio no tiene una suscripción vigente
Cuando consulto su estado
Entonces el sistema informa que no hay un plan activo.

## US42: Cambiar el plan de suscripción

**Description:** Como administrador, quiero cambiar el plan de mi comercio para ajustar su capacidad de empleados a sus necesidades.

### Acceptance Criteria

#### Scenario 1: Cambio confirmado
Dado que mi comercio tiene una suscripción vigente y selecciono otro plan disponible
Cuando confirmo la solicitud y el servicio de pagos confirma el cambio
Entonces el sistema muestra el plan actualizado, su capacidad y la fecha de vigencia comunicada por el servicio de pagos.

#### Scenario 2: Cambio no confirmado
Dado que solicito cambiar el plan vigente
Cuando el servicio de pagos rechaza o no completa la operación
Entonces el sistema conserva el plan actual e informa que el cambio no se realizó.

## US27: Cancelar una suscripción

**Description:** Como administrador, quiero cancelar la renovación de la suscripción para detener los cobros de periodos futuros.

### Acceptance Criteria

#### Scenario 1: Cancelación programada
Dado que la suscripción está activa y el periodo ya fue pagado
Cuando solicito cancelarla
Entonces el sistema programa la cancelación para el siguiente pago y mantiene el servicio durante el periodo vigente.

#### Scenario 2: Consultar la cancelación
Dado que la cancelación está programada
Cuando consulto la suscripción
Entonces el sistema muestra que seguirá activa hasta finalizar el periodo pagado.

#### Scenario 3: Continuar la suscripción
Dado que la cancelación está programada y el periodo vigente continúa activo
Cuando ingreso nuevamente un medio de pago antes del próximo cobro
Entonces el sistema lo registra para la renovación y la suscripción continúa.

## US30: Añadir un contacto de emergencia

**Description:** Como empleado, quiero añadir mis contactos de emergencia para tener disponible la información de las personas que elijo.

### Acceptance Criteria

#### Scenario 1: Contacto válido
Dado que ingreso los datos requeridos con un formato válido
Cuando guardo el contacto
Entonces el sistema lo asocia a mi cuenta.

#### Scenario 2: Datos inválidos
Dado que falta información obligatoria o su formato no es válido
Cuando intento guardar el contacto
Entonces el sistema indica qué debo corregir.

## US31: Editar un contacto de emergencia

**Description:** Como empleado, quiero editar mis contactos de emergencia para mantenerlos actualizados.

### Acceptance Criteria

#### Scenario 1: Actualización válida
Dado que selecciono uno de mis contactos e ingreso datos válidos
Cuando guardo los cambios
Entonces el sistema actualiza la información asociada a mi cuenta.

#### Scenario 2: Actualización inválida
Dado que ingreso información con un formato no válido
Cuando intento guardarla
Entonces el sistema solicita corregirla y conserva los datos anteriores.

## US32: Eliminar un contacto de emergencia

**Description:** Como empleado, quiero eliminar un contacto de emergencia para mantener actualizada mi lista personal.

### Acceptance Criteria

#### Scenario 1: Eliminación confirmada
Dado que selecciono un contacto propio y confirmo su eliminación
Cuando el sistema procesa la solicitud
Entonces el contacto deja de aparecer en mi lista.

#### Scenario 2: Eliminación cancelada
Dado que inicio la eliminación de un contacto
Cuando cancelo la operación
Entonces el sistema conserva el contacto en mi lista.

## US39: Configurar preferencias de notificación

**Description:** Como usuario, quiero configurar mis preferencias para decidir qué notificaciones de InstAlert deseo recibir dentro de la aplicación.

### Acceptance Criteria

#### Scenario 1: Guardar preferencias
Dado que modifico una preferencia disponible
Cuando guardo los cambios
Entonces el sistema conserva la configuración.

#### Scenario 2: Aplicar preferencias
Dado que tengo preferencias guardadas
Cuando se publica una alerta correspondiente a ellas
Entonces el sistema considera esa configuración al mostrar notificaciones dentro de la aplicación.

## TS-01: Endpoint para registrar alertas e incidentes

**Description:** Como desarrollador frontend, quiero endpoints para registrar alertas e incidentes en la aplicación.

### Acceptance Criteria

#### Scenario 1: Solicitud válida
Dado que la aplicación envía un reporte con los datos requeridos
Cuando la API procesa la solicitud
Entonces registra la alerta o el incidente y devuelve su identificador y estado.

#### Scenario 2: Datos inválidos
Dado que el reporte tiene datos incompletos o inválidos
Cuando la aplicación lo envía
Entonces la API devuelve errores de validación que la interfaz puede mostrar.

## TS-02: Endpoint para consultar alertas e incidentes

**Description:** Como desarrollador frontend, quiero endpoints para consultar alertas activas, el historial y los detalles de los reportes.

### Acceptance Criteria

#### Scenario 1: Consulta de reportes
Dado que la aplicación solicita alertas activas o registros del historial
Cuando la API procesa los filtros recibidos
Entonces devuelve los reportes que coinciden con los criterios.

#### Scenario 2: Detalle disponible
Dado que la aplicación solicita un reporte existente por su identificador
Cuando la API procesa la consulta
Entonces devuelve la información registrada del reporte.

## TS-04: Endpoint para consultar el mapa de riesgo

**Description:** Como desarrollador frontend, quiero endpoints para obtener los datos del mapa de calor y el detalle de una zona.

### Acceptance Criteria

#### Scenario 1: Consulta geográfica
Dado que la aplicación solicita un área y filtros del mapa
Cuando la API procesa la consulta
Entonces devuelve los datos geográficos correspondientes.

#### Scenario 2: Detalle de zona
Dado que la aplicación solicita una zona por su identificador
Cuando la API procesa la consulta
Entonces devuelve la información disponible de esa zona.

## TS-05: Endpoints para gestionar contactos de emergencia

**Description:** Como desarrollador frontend, quiero endpoints para consultar, agregar, editar y eliminar contactos de emergencia.

### Acceptance Criteria

#### Scenario 1: Consultar contactos
Dado que existen contactos de emergencia registrados
Cuando la aplicación solicita la lista
Entonces la API devuelve los contactos para mostrarlos.

#### Scenario 2: Mantener un contacto
Dado que la aplicación envía una operación válida para crear, editar o eliminar un contacto
Cuando la API la procesa
Entonces confirma el resultado para actualizar la lista.

## TS-06: Endpoints para gestionar notificaciones y preferencias

**Description:** Como desarrollador frontend, quiero endpoints para consultar las notificaciones y guardar las preferencias del usuario.

### Acceptance Criteria

#### Scenario 1: Consultar notificaciones
Dado que existen notificaciones para el usuario
Cuando la aplicación las consulta
Entonces la API devuelve la lista y su estado de lectura.

#### Scenario 2: Guardar preferencias
Dado que la aplicación envía cambios válidos en las preferencias
Cuando la API los guarda
Entonces devuelve la configuración actualizada.

## TS-07: Endpoints para consultar planes y gestionar suscripciones

**Description:** Como desarrollador frontend, quiero endpoints para consultar los planes y el estado de la suscripción del comercio, e iniciar cambios en ella.

### Acceptance Criteria

#### Scenario 1: Consultar planes
Dado que la aplicación solicita las opciones disponibles
Cuando la API consulta los planes
Entonces devuelve sus características y límites.

#### Scenario 2: Gestionar la suscripción
Dado que el comercio tiene una suscripción vigente
Cuando la aplicación solicita un cambio o su cancelación
Entonces la API devuelve el estado de la operación y conserva activo el periodo pagado cuando la cancelación es para el siguiente cobro.

**Note:** La aplicación no enviará ni almacenará el número completo de tarjeta.
