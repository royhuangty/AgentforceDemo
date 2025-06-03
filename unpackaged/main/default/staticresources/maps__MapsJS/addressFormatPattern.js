/**
 * Define address format patterns.
 */
const AddressFormatPattern = Object.freeze({
    /**
     *
     * N: Name (The formatting of names for this field is outside of the scope of the address elements.)
     * O: Organization
     * A: Address Lines (2 or 3 lines address)
     * D: District (Sub-locality): smaller than a city, and could be a neighborhood, suburb or dependent locality.
     * C: City (Locality)
     * S: State (Administrative Area)
     * K: Country
     * Z: ZIP Code / Postal Code
     * X: Sorting code, for example, CEDEX as used in France
     * n: newline
     */
    A: Symbol('Address Lines'),
    C: Symbol('City'),
    S: Symbol('State'),
    K: Symbol('Country'),
    Z: Symbol('Zip Code'),
    n: Symbol('New Line'),
    fromPlaceHolder: (placeHolder) => {
        switch (placeHolder) {
        case 'A': return AddressFormatPattern.A;
        case 'C': return AddressFormatPattern.C;
        case 'S': return AddressFormatPattern.S;
        case 'K': return AddressFormatPattern.K;
        case 'Z': return AddressFormatPattern.Z;
        case 'n': return AddressFormatPattern.n;
        }
        return null;
    },
    getPlaceHolder: (pattern) => {
        switch (pattern) {
        case AddressFormatPattern.A: return 'A';
        case AddressFormatPattern.C: return 'C';
        case AddressFormatPattern.S: return 'S';
        case AddressFormatPattern.K: return 'K';
        case AddressFormatPattern.Z: return 'Z';
        case AddressFormatPattern.n: return 'n';
        }
        return null;
    },
    getData: (pattern, data) => {
        if (data) {
            switch (pattern) {
            case AddressFormatPattern.A: return data.address;
            case AddressFormatPattern.C: return data.city;
            case AddressFormatPattern.S: return data.state;
            case AddressFormatPattern.K: return data.country;
            case AddressFormatPattern.Z: return data.zipCode;
            case AddressFormatPattern.n: return data.newLine;
            }
        }
        return null;
    },
});

export default AddressFormatPattern;
