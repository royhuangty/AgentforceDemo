import data from './data.js';
import languageCodeToCountry from './languageToCountry.js';
import addressFormatter from './addressFormatter.js';

const CJK_COUNTRIES = ['CN', 'HK', 'TW', 'JP', 'KR', 'KP'];
const CJK_LANGUAGES = ['zh', 'ja', 'ko'];

export default {
    /**
     * Gets the globalization for the specified country code.
     * A: Address Lines (2 or 3 lines address)
     * C: City (Locality)
     * S: State (Administrative Area)
     * K: Country
     * Z: ZIP Code / Postal Code
     * n: newline
     *
     * @param {string} langCode Language Code
     * @param {string} countryCode Country Code
     * @return {{fmt: string, input: string, require: string}} Format Data
     */
    getAddressInfoForCountry(langCode, countryCode) {
        const code = this.getCountryFromLocale(langCode, countryCode);
        if (data[code]) {
            // Double check.
            let cloneAddressRep = Object.freeze(Object.assign({}, data[code]));
            return Object.freeze({
                address: cloneAddressRep,
            });
        }
        return {};
    },

    /**
     * Get the format pattern.
     * A: Address Lines (2 or 3 lines address)
     * C: City (Locality)
     * S: State (Administrative Area)
     * K: Country
     * Z: ZIP Code / Postal Code
     * n: newline
     *
     * @param {string} langCode Language Code
     * @param {string} countryCode Country Code
     * @return {string} Address Format Pattern
     */
    getAddressFormat(langCode, countryCode) {
        const code = this.getCountryFromLocale(langCode, countryCode);
        if (data[code]) {
            // Double check.
            return data[code].fmt;
        }
        return '';
    },

    /**
     * Get the input order pattern.
     * A: Address Lines (2 or 3 lines address)
     * C: City (Locality)
     * S: State (Administrative Area)
     * K: Country
     * Z: ZIP Code / Postal Code
     * n: newline
     *
     * @param {string} langCode Language Code
     * @param {string} countryCode Country Code
     * @return {string} Input Order
     */
    getAddressInputOrder(langCode, countryCode) {
        // A special case to deal with en_HK locale. We want to use US like
        // format for en_HK.
        // See W-4718344
        if (langCode && langCode.toLowerCase() == 'en' && countryCode && countryCode.toUpperCase() == 'HK') {
            langCode = 'en';
            countryCode = 'US';
        }

        const code = this.getCountryFromLocale(langCode, countryCode);
        if (data[code]) {
            // Double check.
            return data[code].input;
        }
        return '';
    },

    /**
     * Get the input order pattern for all fields.
     * A: Address Lines (2 or 3 lines address)
     * C: City (Locality)
     * S: State (Administrative Area)
     * K: Country
     * Z: ZIP Code / Postal Code
     * n: newline
     *
     * @param {string} langCode Language Code
     * @param {string} countryCode Country Code
     * @return {string} Input Order
     */
    getAddressInputOrderAllField(langCode, countryCode) {
        // A special case to deal with en_HK locale. We want to use US like
        // format for en_HK.
        // See W-4718344
        if (langCode && langCode.toLowerCase() == 'en' && countryCode && countryCode.toUpperCase() == 'HK') {
            langCode = 'en';
            countryCode = 'US';
        }

        // Double check.
        const code = this.getCountryFromLocale(langCode, countryCode);
        if (data[code]) {
            let input = data[code].input;

            // Add missing patterns.
            if (input.indexOf('S') === -1) {
                input = input.replace('K', 'SK');
            }
            if (input.indexOf('C') === -1) {
                input = input.replace('S', 'CS');
            }
            if (input.indexOf('Z') === -1) {
                input = input.replace('C', 'ZC');
            }

            return input;
        }
        return '';
    },

    /**
     * Get required fields.
     * A: Address Lines (2 or 3 lines address)
     * C: City (Locality)
     * S: State (Administrative Area)
     * K: Country
     * Z: ZIP Code / Postal Code
     * n: newline
     *
     * @param {string} langCode Language Code
     * @param {string} countryCode Country Code
     * @return {string} Required Fields
     */
    getAddressRequireFields(langCode, countryCode) {
        const code = this.getCountryFromLocale(langCode, countryCode);
        if (data[code]) {
            // Double check.
            return data[code].require;
        }
        return '';
    },

    /**
     * Format a address values for given language code and country code with specified line break.
     *
     * @param {string} langCode Language Code
     * @param {string} countryCode Country Code
     * @param {{address: string, country: string, city: string, state: string, zipCode: string}} values Actual Address Data
     * @param {string} lineBreak Line Break
     * @return {string} Formatted Address
     */
    formatAddressAllFields(langCode, countryCode, values, lineBreak) {
        const code = this.getCountryFromLocale(langCode, countryCode, values);
        if (data[code]) {
            // Double check.
            let pattern = data[code].fmt;
            // Some countries don't have City, State or ZIP code. We don't want to
            // lose those data from formatted string.
            if (values.zipCode && pattern.indexOf('%Z') === -1) {
                pattern = pattern.replace('%K', '%Z %K');
            }
            if (values.city && pattern.indexOf('%C') === -1) {
                pattern = pattern.replace('%K', '%C %K');
            }
            if (values.state && pattern.indexOf('%S') === -1) {
                pattern = pattern.replace('%K', '%S %K');
            }
            return this.buildAddressLines(pattern, values, lineBreak, true);
        }
        return '';
    },

    /**
     * Format a address values for given language code and country code with specified line break.
     *
     * @param {string} langCode Language Code
     * @param {string} countryCode Country Code
     * @param {{address: string, country: string, city: string, state: string, zipCode: string}} values Actual Address Data
     * @param {string} lineBreak Line Break
     * @return {string} Formatted Address
     */
    formatAddress(langCode, countryCode, values, lineBreak) {
        const code = this.getCountryFromLocale(langCode, countryCode, values);
        if (data[code]) {
            // Double check.
            return this.buildAddressLines(data[code].fmt, values, lineBreak, true);
        }
        return '';
    },

    /**
     * Creates an array of address lines given the format and the values to use.
     *
     * @param {string} pattern
     * @param {{address: string, country: string, city: string, state: string, zipCode: string}} values
     * @param {string} lineBreak
     * @param {string} ignoreEmptyLines
     * @return {string} the text for use in the address
     */
    buildAddressLines(pattern, values, lineBreak, ignoreEmptyLines) {
        return addressFormatter.format(values, pattern, lineBreak, ignoreEmptyLines);
    },

    /**
     * Resolve the reference by tracing down the _ref value.
     * @param {*} data Address Format Data
     * @param {string} countryCode Country Code
     * @return {*} Referenced Address Format Data
     */
    followReferences(data, countryCode) {
        if (data[countryCode] && data[countryCode]._ref) {
            return this.followReferences(data, data[countryCode]._ref);
        }
        return countryCode;
    },

    /**
     * Check strings for Han characters
     *
     * @param {...string} values String values to check against
     * @return {boolean} true if any of string values contain Han script character
     */
    containsHanScript(...values) {
        if (!values || !Array.isArray(values)) return false;
        return values.some((value) => {
            if (!value) return false;
            // Javascript regex do not work with surrogate pairs so String#match is unusable with supplemental ranges.
            // Iterating a string returns a char that contains one codepoint.
            // Surrogate pairs will be returned as a pair.
            // Unicode block ranges: @see http://www.unicode.org/Public/UCD/latest/ucd/Blocks.txt
            for (const singleChar of value) {
                let codePoint = singleChar.codePointAt(0); // Thank you ES2015
                if (
                    (0x2e80 <= codePoint && codePoint <= 0x2eff) || // CJK Radicals Supplement
                    (0x3300 <= codePoint && codePoint <= 0x33ff) || // CJK Compatibility
                    (0xfe30 <= codePoint && codePoint <= 0xfe4f) || // CJK Compatibility Forms
                    (0xf900 <= codePoint && codePoint <= 0xfaff) || // CJK Compatibility Ideographs
                    (0x2f800 <= codePoint && codePoint <= 0x2fa1f) || // CJK Compatibility Ideographs Supplement
                    (0x3000 <= codePoint && codePoint <= 0x303f) || // CJK Symbols and Punctuation
                    (0x4e00 <= codePoint && codePoint <= 0x9fff) || // CJK Unified Ideographs
                    (0x3400 <= codePoint && codePoint <= 0x4dbf) || // CJK Unified Ideographs Extension A
                    (0x20000 <= codePoint && codePoint <= 0x2a6df) || // CJK Unified Ideographs Extension B
                    (0x2a700 <= codePoint && codePoint <= 0x2b73f) || // CJK Unified Ideographs Extension C
                    (0x2b740 <= codePoint && codePoint <= 0x2b81f) || // CJK Unified Ideographs Extension D
                    (0x2b820 <= codePoint && codePoint <= 0x2ceaf) || // CJK Unified Ideographs Extension E // Not on core
                    (0x2ceb0 <= codePoint && codePoint <= 0x2ebef) || // CJK Unified Ideographs Extension F // Not on core
                    (0x3200 <= codePoint && codePoint <= 0x32ff) || // Enclosed CJK Letters and Months
                    (0x31c0 <= codePoint && codePoint <= 0x31ef) || // CJK Strokes
                    // Chinese
                    (0x3100 <= codePoint && codePoint <= 0x312f) || // Bopomofo
                    (0x31a0 <= codePoint && codePoint <= 0x31bf) || // Bopomofo Extended
                    (0x2f00 <= codePoint && codePoint <= 0x2fdf) || // Kangxi Radicals
                    (0x2ff0 <= codePoint && codePoint <= 0x2fff) || // Ideographic Description Characters
                    // Japanese
                    (0xff00 <= codePoint && codePoint <= 0xffef) || // Halfwidth and Fullwidth Forms
                    (0x3040 <= codePoint && codePoint <= 0x309f) || // Hiragana
                    (0x30a0 <= codePoint && codePoint <= 0x30ff) || // Katakana
                    (0x31f0 <= codePoint && codePoint <= 0x31ff) || // Katakana Phonetic Extensions
                    (0x1b000 <= codePoint && codePoint <= 0x1b0ff) || // Kana Supplement
                    (0x1b100 <= codePoint && codePoint <= 0x1b12f) || // Kana Extended-A // Not on core
                    // Korean
                    (0x1100 <= codePoint && codePoint <= 0x11ff) || // Hangul Jamo
                    (0xac00 <= codePoint && codePoint <= 0xd7af) || // Hangul Syllables
                    (0x3130 <= codePoint && codePoint <= 0x318f) || // Hangul Compatibility Jamo
                    (0xa960 <= codePoint && codePoint <= 0xa97f) || // Hangul Jamo Extended-A
                    (0xd7b0 <= codePoint && codePoint <= 0xd7ff) // Hangul Jamo Extended-B
                ) {
                    return true;
                }
            }
            return false;
        });
    },

    /**
     * Returns the address code (country code) for given locale and data.
     *
     * @param {string} langCode Language Code
     * @param {string} countryCode Country Code
     * @param {*} values Address Data
     * @return {string} Address Code
     */
    getCountryFromLocale(langCode, countryCode, values) {
        if (values) {
            const isCJK =
                (!countryCode && CJK_LANGUAGES.indexOf(langCode.toLowerCase()) >= 0) ||
                (countryCode && CJK_COUNTRIES.indexOf(countryCode.toUpperCase()) >= 0);
            const isJA =
                (!countryCode && 'ja' == langCode.toLowerCase()) || (countryCode && 'JP' == countryCode.toUpperCase());

            // English format (ja_en_JP) is only used when all fields do not contain CJK characters
            if (
                !(isJA && this.containsHanScript(values.address, values.city, values.state, values.country)) &&
                isCJK &&
                !this.containsHanScript(values.address)
            ) {
                return this.getCountryFromLocale(langCode, 'EN_' + countryCode);
            }
        }

        let country = countryCode;
        // hack for 'uz_Latn_UZ'. caller may pass 'Latn' as countryCode. override with 'UZ' here.
        if (langCode == 'uz' && country && country.toLowerCase() == 'latn') {
            country = 'UZ';
        }

        // Address format should be always associated to a COUNTRY.
        // If country part is empty, we need to map language to a
        // certain country. For example, "de" -> "DE".da
        if (!country && languageCodeToCountry.languageCode[langCode]) {
            country = languageCodeToCountry.languageCode[langCode];
        }

        // Trace the real data from country reference.
        country = this.followReferences(data, country);

        if (!country || !data[country]) {
            return 'US'; // Always fall back to US format.
        }

        return country;
    },

    /**
     * Get fall back country code.
     *
     * @param {string} langCode Language Code
     * @param {string} countryCode Country Code
     * @param {*} address Address Data
     * @return {string} Address Code
     *
     * @deprecated Use getCountryFromLocale instead
     */
    getFallback(langCode, countryCode, address) {
        return this.getCountryFromLocale(langCode, countryCode);
    },
};
