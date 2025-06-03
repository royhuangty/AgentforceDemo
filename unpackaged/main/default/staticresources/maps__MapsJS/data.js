export default {
    AE: {
        fmt: '%A%n%S%n%Z %C %K',
        require: 'AS',
        input: 'ASK',
    },
    AF: {
        fmt: '%A%n%C%n%Z%n%S %K',
        require: 'ACZ',
        input: 'ACZK',
    },
    AL: {
        fmt: '%A%n%Z%n%C%n%S %K',
        require: 'AZC',
        input: 'AZCK',
    },
    AM: {
        fmt: '%A%n%Z%n%C%n%S%n%K',
        require: 'AZCS',
        input: 'AZK',
    },
    AR: {
        fmt: '%A%n%Z %C%n%S%n%K',
        require: 'AZCS',
        input: 'AZCSK',
    },
    AT: {
        fmt: '%A%n%Z %C%n%S %K',
        require: 'AZC',
        input: 'AZCK',
    },
    AU: {
        fmt: '%A%n%C %S %Z%n%K',
        require: 'ACSZ',
        input: 'ACSZK',
    },
    AZ: {
        fmt: '%A%n%Z %C%n%S %K',
        require: 'AZC',
        input: 'AZCK',
    },
    BA: {
        _ref: 'AT',
    },
    BB: {
        _ref: 'US',
    },
    BD: {
        fmt: '%A%n%C - %Z%n%S %K',
        require: 'ACZ',
        input: 'ACZK',
    },
    BG: {
        _ref: 'AT',
    },
    BH: {
        fmt: '%A%n%C %Z%n%S %K',
        require: 'ACZ',
        input: 'ACZK',
    },
    BM: {
        _ref: 'BH',
    },
    BN: {
        _ref: 'BH',
    },
    BR: {
        fmt: '%A%n%C-%S%n%Z%n%K',
        require: 'ACSZ',
        input: 'ACSZK',
    },
    BS: {
        _ref: 'US',
    },
    BT: {
        _ref: 'BH',
    },
    CA: {
        _ref: 'AU',
    },
    CH: {
        _ref: 'AT',
    },
    CL: {
        _ref: 'AR',
    },
    CN: {
        fmt: '%K%n%S %C%n%A%n%Z',
        require: 'CAZ',
        input: 'KSCAZ',
    },
    CO: {
        fmt: '%A%n%C, %S, %Z%n%K',
        require: 'ACSZ',
        input: 'ACSZK',
    },
    CR: {
        fmt: '%A%n%S, %C%n%Z%n%K',
        require: 'ACSZ',
        input: 'ASCZK',
    },
    CV: {
        _ref: 'AR',
    },
    CY: {
        _ref: 'AT',
    },
    DE: {
        _ref: 'AT',
    },
    DK: {
        _ref: 'AT',
    },
    DO: {
        _ref: 'AT',
    },
    DZ: {
        _ref: 'AT',
    },
    EC: {
        _ref: 'AL',
    },
    EE: {
        _ref: 'AT',
    },
    EG: {
        fmt: '%A%n%C%n%S%n%Z%n%K',
        require: 'ACSZ',
        input: 'ACSZK',
    },
    EN_JP: {
        fmt: '%A%n%C %S%n%Z %K',
        require: 'ACSZ',
        input: 'ACSZK',
    },
    ES: {
        fmt: '%A%n%Z %C %S%n%K',
        require: 'AZCS',
        input: 'AZCSK',
    },
    ET: {
        _ref: 'AT',
    },
    FI: {
        fmt: '%A%n%Z %C%n%S %K',
        require: 'AZC',
        input: 'AZCK',
    },
    FK: {
        _ref: 'AF',
    },
    FR: {
        _ref: 'AT',
    },
    GB: {
        fmt: '%A%n%C%n%S%n%Z%n%K',
        require: 'ACZ',
        input: 'ACSZK',
    },
    GE: {
        _ref: 'AT',
    },
    GL: {
        _ref: 'AT',
    },
    GR: {
        _ref: 'AT',
    },
    GT: {
        fmt: '%A%n%Z-%C%n%S %K',
        require: 'AZC',
        input: 'AZCK',
    },
    HK: {
        fmt: '%K%S%C%n%A%n%Z',
        require: 'CA',
        input: 'KSCAZ',
    },
    HN: {
        fmt: '%A%n%C, %S%n%Z%n%K',
        require: 'ACSZ',
        input: 'ACSZK',
    },
    HR: {
        fmt: '%A%n%Z %C%n%S %K',
        require: 'AZC',
        input: 'AZCK',
    },
    HT: {
        fmt: '%A%n%Z %C%n%S %K',
        require: 'AZC',
        input: 'AZCK',
    },
    HU: {
        fmt: '%C%n%A%n%Z%n%S %K',
        require: 'CAZ',
        input: 'CAZK',
    },
    ID: {
        fmt: '%A%n%C%n%S %Z%n%K',
        require: 'ACSZ',
        input: 'ACSZK',
    },
    IE: {
        _ref: 'ID',
    },
    IL: {
        _ref: 'AT',
    },
    IN: {
        fmt: '%A%n%C %Z%n%S%n%K',
        require: 'ACZS',
        input: 'ACZSK',
    },
    IQ: {
        _ref: 'HN',
    },
    IR: {
        fmt: '%S%n%C%n%A%n%Z%n%K',
        require: 'SCAZ',
        input: 'SCAZK',
    },
    IS: {
        _ref: 'AT',
    },
    IT: {
        _ref: 'ES',
    },
    JM: {
        fmt: '%A%n%C%n%S%n%Z %K',
        require: 'ACS',
        input: 'ACSK',
    },
    JO: {
        _ref: 'BH',
    },
    JP: {
        fmt: '%K%n〒%Z%n%S %C%n%A',
        require: 'ZCA',
        input: 'KZSCA',
    },
    KE: {
        _ref: 'AF',
    },
    KG: {
        fmt: '%Z %C%n%A%n%S%n%K',
        require: 'ZCA',
        input: 'ZCAK',
    },
    KH: {
        _ref: 'BH',
    },
    KR: {
        fmt: '%S %C%n%A%n%Z%n%K',
        require: 'SCAZ',
        input: 'SCAZK',
    },
    KW: {
        _ref: 'AT',
    },
    KY: {
        fmt: '%A%n%S %Z%n%C %K',
        require: 'ASZ',
        input: 'ASZK',
    },
    KZ: {
        fmt: '%Z%n%S%n%C%n%A%n%K',
        require: 'ZSCA',
        input: 'ZSCAK',
    },
    LA: {
        _ref: 'AT',
    },
    LB: {
        _ref: 'BH',
    },
    LK: {
        _ref: 'AF',
    },
    LR: {
        _ref: 'AT',
    },
    LT: {
        fmt: '%A%n%Z %C%n%S %K',
        require: 'AZC',
        input: 'AZCK',
    },
    LV: {
        fmt: '%A%n%C, %Z%n%S %K',
        require: 'ACZ',
        input: 'ACZK',
    },
    MA: {
        _ref: 'AT',
    },
    MC: {
        fmt: '%A%n%Z %C%n%S %K',
        require: 'AZC',
        input: 'AZCK',
    },
    MD: {
        fmt: '%A%n%Z %C%n%S %K',
        require: 'AZC',
        input: 'AZCK',
    },
    MG: {
        _ref: 'AT',
    },
    MK: {
        _ref: 'AT',
    },
    MM: {
        _ref: 'LV',
    },
    MT: {
        _ref: 'BH',
    },
    MU: {
        _ref: 'AL',
    },
    MW: {
        fmt: '%A%n%C%n%Z %S %K',
        require: 'AC',
        input: 'ACK',
    },
    MX: {
        fmt: '%A%n%Z %C, %S%n%K',
        require: 'AZCS',
        input: 'AZCSK',
    },
    MY: {
        _ref: 'AR',
    },
    MZ: {
        _ref: 'AT',
    },
    NG: {
        _ref: 'IN',
    },
    NI: {
        fmt: '%A%n%Z%n%C, %S%n%K',
        require: 'AZCS',
        input: 'AZCSK',
    },
    NL: {
        _ref: 'AT',
    },
    NO: {
        _ref: 'AT',
    },
    NP: {
        _ref: 'BH',
    },
    NZ: {
        _ref: 'BH',
    },
    OM: {
        _ref: 'AL',
    },
    PA: {
        _ref: 'JM',
    },
    PE: {
        _ref: 'IN',
    },
    PG: {
        fmt: '%A%n%C %Z %S%n%K',
        require: 'ACZS',
        input: 'ACZSK',
    },
    PH: {
        fmt: '%A, %C%n%Z %S%n%K',
        require: 'ACZS',
        input: 'ACZSK',
    },
    PK: {
        fmt: '%A%n%C-%Z%n%S %K',
        require: 'ACZ',
        input: 'ACZK',
    },
    PL: {
        _ref: 'AT',
    },
    PR: {
        fmt: '%A%n%C %Z%n%S %K',
        require: 'ACZ',
        input: 'ACZK',
    },
    PT: {
        _ref: 'AT',
    },
    PY: {
        _ref: 'AT',
    },
    RO: {
        _ref: 'AT',
    },
    RS: {
        _ref: 'AT',
    },
    RU: {
        _ref: 'EG',
    },
    SA: {
        _ref: 'BH',
    },
    SC: {
        _ref: 'JM',
    },
    SE: {
        fmt: '%A%n%Z %C%n%S %K',
        require: 'AZC',
        input: 'AZCK',
    },
    SG: {
        fmt: '%A%n%C %Z%n%S%n%K',
        require: 'AZ',
        input: 'AZK',
    },
    SH: {
        _ref: 'AF',
    },
    SI: {
        fmt: '%A%n%Z %C%n%S %K',
        require: 'AZC',
        input: 'AZCK',
    },
    SK: {
        _ref: 'AT',
    },
    SO: {
        _ref: 'US',
    },
    SR: {
        _ref: 'JM',
    },
    SV: {
        fmt: '%A%n%Z-%C%n%S%n%K',
        require: 'AZCS',
        input: 'AZCSK',
    },
    SZ: {
        _ref: 'AF',
    },
    TH: {
        _ref: 'ID',
    },
    TJ: {
        _ref: 'AT',
    },
    TN: {
        _ref: 'AT',
    },
    TR: {
        fmt: '%A%n%Z %C/%S%n%K',
        require: 'AZC',
        input: 'AZCK',
    },
    TW: {
        fmt: '%K%n%Z%n%S %C%n%A',
        require: 'ZSCA',
        input: 'KZSCA',
    },
    TZ: {
        _ref: 'AT',
    },
    UA: {
        _ref: 'EG',
    },
    US: {
        fmt: '%A%n%C, %S %Z%n%K',
        require: 'ACSZ',
        input: 'ACSZK',
    },
    UY: {
        _ref: 'ES',
    },
    UZ: {
        _ref: 'AR',
    },
    VE: {
        fmt: '%A%n%C %Z, %S%n%K',
        require: 'ACZS',
        input: 'ACZSK',
    },
    VN: {
        _ref: 'ID',
    },
    WF: {
        _ref: 'AT',
    },
    ZA: {
        _ref: 'AF',
    },
};
