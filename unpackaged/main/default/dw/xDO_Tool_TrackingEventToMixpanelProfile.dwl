%dw 2.0
import * from dw::core::Strings

input payload json
input context json
output json

var TOKEN = '\$token'
var DISTINCT_ID = '\$distinct_id'
var SET = '\$set'
var EMAIL = 'email'
var VALID_PROPERTIES = [TOKEN, DISTINCT_ID, SET]
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

validate(
    payload map {
        (TOKEN) : context.projectToken,
        (DISTINCT_ID) : sanitize($[EMAIL]),
        (SET) : $ mapObject {
            (if ($$ ~= EMAIL) capitalize($$)
            else (underscore(dasherize($$)))) :
                if ($$ ~= EMAIL) sanitize($)
                else $
        }
    } distinctBy $[DISTINCT_ID]
)