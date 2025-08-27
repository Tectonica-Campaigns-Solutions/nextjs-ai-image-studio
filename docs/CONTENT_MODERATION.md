# Content Moderation System

Este sistema de moderación de contenido está diseñado específicamente para organizaciones como ONGs y partidos políticos que necesitan generar imágenes de forma responsable y conforme a sus políticas internas.

## Características Principales

### ✅ Configuración por Organización
- Reglas específicas para NGOs, partidos políticos y organizaciones de advocacy
- Configuración completamente personalizable sin código hardcodeado
- Soporte multiidioma (inglés, español, francés)

### ✅ Múltiples Capas de Moderación
1. **OpenAI Moderation API** - Detección automática de contenido inapropiado
2. **Filtros Locales** - Términos específicos configurables por organización  
3. **Análisis Contextual** - Evaluación del contexto y la intención del contenido

### ✅ Prevención Proactiva
- Bloqueo ANTES de la generación de imágenes
- Mensajes informativos específicos para cada tipo de contenido bloqueado
- No se consumen recursos de generación en contenido inapropiado

## Configuración Rápida

### 1. Configurar Tipo de Organización

En el frontend, especifica el tipo de organización:

```typescript
// En el formulario de generación
formData.append("orgType", "ngo") // o "political_party", "advocacy", etc.
```

### 2. Tipos de Organización Disponibles

- `general` - Configuración básica (por defecto)
- `ngo` - Configuración para ONGs
- `political_party` - Configuración para partidos políticos  
- `advocacy` - Configuración para organizaciones de advocacy

### 3. Personalizar Configuraciones

Edita `lib/content-moderation-config.ts` para ajustar:

```typescript
export const organizationConfigs: Record<string, Partial<ContentModerationConfig>> = {
  'mi_organizacion': {
    strictnessLevel: 'high',
    blockedTerms: {
      explicitContent: ['término1', 'término2'],
      publicFigures: ['figura1', 'figura2'],
      // ... más categorías
    },
    messages: {
      general: "Este contenido no está permitido por las políticas de nuestra organización."
    }
  }
}
```

## Ejemplos de Uso

### Para ONG Ambiental
```typescript
formData.append("orgType", "environmental_ngo")
// Bloquea: contenido anti-ambiental, negación del cambio climático
// Permite: contenido educativo, campañas de concienciación
```

### Para Partido Político
```typescript
formData.append("orgType", "political_party") 
// Bloquea: candidatos opositores, desinformación electoral
// Permite: materiales de campaña, ilustraciones de políticas
```

### Para ONG de Derechos Humanos
```typescript
formData.append("orgType", "human_rights_ngo")
// Bloquea: contenido que niegue derechos humanos
// Permite: materiales educativos, campañas de concienciación
```

## API de Moderación

### Endpoint: `/api/content-moderation`

#### POST - Verificar Contenido
```json
{
  "text": "texto a verificar",
  "orgType": "ngo"
}
```

**Respuesta exitosa:**
```json
{
  "allowed": true,
  "message": "Content approved"
}
```

**Respuesta bloqueada:**
```json
{
  "allowed": false,
  "reason": "explicitContent",
  "message": "Este contenido contiene material explícito que no es apropiado para uso organizacional.",
  "details": "Términos detectados: [término1, término2]"
}
```

#### GET - Obtener Configuración
```
GET /api/content-moderation?orgType=ngo
```

**Respuesta:**
```json
{
  "config": {
    "strictnessLevel": "high",
    "blockedTerms": { ... },
    "messages": { ... }
  }
}
```

## Configuraciones Predefinidas

### 📚 Ver Ejemplos Completos
Consulta `config/organization-examples.ts` para ver configuraciones completas de ejemplo para:

- ONG Ambiental
- Partido Político
- ONG de Derechos Humanos  
- ONG de Educación Juvenil

### 🔧 Personalización Avanzada

#### Niveles de Restricción
- `low` - Bloquea solo contenido explícitamente inapropiado
- `medium` - Incluye términos sensibles adicionales
- `high` - Máxima protección, ideal para organizaciones públicas

#### Categorías de Términos Bloqueados
- `explicitContent` - Contenido sexual/adulto
- `publicFigures` - Celebridades, políticos
- `inappropriateLanguage` - Lenguaje ofensivo
- `sensitiveTopics` - Temas controvertidos
- `violentContent` - Contenido violento
- `misinformation` - Desinformación

#### Mensajes Personalizados
Cada categoría puede tener su propio mensaje explicativo:

```typescript
messages: {
  explicitContent: "Mensaje específico para contenido explícito",
  publicFigure: "Mensaje para figuras públicas",
  general: "Mensaje general para contenido no permitido"
}
```

## Soporte Multiidioma

El sistema detecta automáticamente términos en:
- **Inglés** - Para organizaciones internacionales
- **Español** - Para organizaciones en países hispanohablantes  
- **Francés** - Para organizaciones francófonas

### Agregar Nuevos Idiomas

```typescript
blockedTerms: {
  explicitContent: [
    'english_term',
    'término_español', 
    'terme_français',
    'deutscher_begriff', // Agregar alemán
    'term_português'     // Agregar portugués
  ]
}
```

## Integración en el Frontend

### Manejo de Errores de Moderación

```typescript
try {
  const response = await fetch("/api/qwen-text-to-image", {
    method: "POST",
    body: formData,
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    if (response.status === 400 && errorData?.error?.includes('blocked by content moderation')) {
      // Mostrar mensaje específico de moderación
      setError(`Contenido no permitido: ${errorData.error}`)
      return
    }
  }
} catch (error) {
  // Manejo de otros errores
}
```

### Componente de Selección de Organización

```typescript
const [orgType, setOrgType] = useState('general')

<select value={orgType} onChange={(e) => setOrgType(e.target.value)}>
  <option value="general">General</option>
  <option value="ngo">ONG</option>
  <option value="political_party">Partido Político</option>
  <option value="advocacy">Organización de Advocacy</option>
</select>
```

## Logs y Monitoreo

El sistema registra automáticamente:
- Intentos de contenido bloqueado
- Tipo de organización utilizado
- Razón específica del bloqueo
- Términos detectados

```
[MODERATION] Content blocked for orgType: ngo
[MODERATION] Reason: explicitContent  
[MODERATION] Detected terms: [término1, término2]
```

## Mejores Prácticas

### ✅ Recomendado
- Configurar `orgType` específico para cada organización
- Personalizar mensajes para reflejar la voz de la organización
- Revisar regularmente los términos bloqueados
- Probar la configuración con casos límite

### ❌ Evitar  
- Hardcodear términos directamente en el código
- Usar configuración `general` para organizaciones específicas
- Bloquear términos demasiado amplios que puedan afectar contenido legítimo
- Ignorar los logs de moderación

## Troubleshooting

### Problema: Contenido legítimo siendo bloqueado
**Solución:** Revisar y ajustar los términos en `blockedTerms` para ser más específicos

### Problema: Contenido inapropiado pasando filtros
**Solución:** Aumentar `strictnessLevel` o agregar términos específicos a `customBlockedTerms`

### Problema: Mensajes en idioma incorrecto
**Solución:** Verificar configuración de idioma y personalizar `messages`

### Problema: Errores de API de moderación
**Solución:** Verificar configuración de `OPENAI_API_KEY` en variables de entorno

---

## Soporte

Para soporte técnico o preguntas sobre configuración:
1. Consulta los ejemplos en `config/organization-examples.ts`
2. Revisa los logs de moderación en la consola
3. Verifica la configuración en `lib/content-moderation-config.ts`
4. Prueba con el endpoint `/api/content-moderation` directamente

Este sistema está diseñado para evolucionar con las necesidades de tu organización. La configuración es completamente flexible y puede adaptarse a cualquier política de contenido específica.
