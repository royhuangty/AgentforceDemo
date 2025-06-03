%dw 2.0
import * from dw::core::Strings

input payload json
input context json
output json

var EVENT = 'event'
var PROPERTIES = 'properties'
var VALID_PROPERTIES = [EVENT, PROPERTIES]
var NO_EMAIL = 'noemail@salesforce.com'

fun validateProperty(data, predicate, deep: Boolean) =
    data match {
        case is Array -> data map validateProperty($, predicate, deep)
        case is Object -> data mapObject (v, k) ->
            if (predicate(k))
                {}
            else if (deep)
                {(k): validateProperty(v, predicate, deep)}
            else
                {(k): v}
        else -> data
    }

fun validate(data, deep: Boolean = false) = validateProperty(data, (k) -> !(VALID_PROPERTIES contains (k as String)), deep)

fun sanitize(data: Any) = if (isEmpty(data)) NO_EMAIL else data replace /(?=\+)(.*?)(?=\@)/ with ''

---
validate((payload update {
    case properties at .properties -> payload.properties reduce ((item, accumulator = {}) -> (accumulator ++ {(item.name) : item.value}))
}
update {
    case .properties.time! -> context['createdTime']
    case .properties.'\$insert_id'! -> context['guid']
    case .properties.distinct_id! -> sanitize(context['email'])
    case .properties.org_id! -> context['orgId']
    case .properties.org_type! -> context['orgType']
    case t at .properties.'type' -> capitalize(t)
}))