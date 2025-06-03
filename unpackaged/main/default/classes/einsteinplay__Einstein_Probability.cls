/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class Einstein_Probability {
    global einsteinplay.Einstein_Probability.Attributes attributes {
        get;
        set;
    }
    global einsteinplay.Einstein_Probability.BoundingBox boundingBox {
        get;
        set;
    }
    global String label {
        get;
        set;
    }
    global List<einsteinplay.Einstein_Probability.NormalizedData> normalizedData {
        get;
        set;
    }
    global String normalizedValue {
        get;
        set;
    }
    global Double probability {
        get;
        set;
    }
    global einsteinplay.Einstein_Probability.Span span {
        get;
        set;
    }
    global String token {
        get;
        set;
    }
    global Einstein_Probability() {

    }
global class Attributes {
    global Integer blockId {
        get;
        set;
    }
    global einsteinplay.Einstein_Probability.CellLocation cellLocation {
        get;
        set;
    }
    global einsteinplay.Einstein_Probability.EntityBlock key {
        get;
        set;
    }
    global String language {
        get;
        set;
    }
    global Integer pageNumber {
        get;
        set;
    }
    global String tag {
        get;
        set;
    }
    global einsteinplay.Einstein_Probability.EntityBlock value {
        get;
        set;
    }
    global Attributes() {

    }
}
global class BoundingBox {
    global Integer maxX {
        get;
        set;
    }
    global Integer maxY {
        get;
        set;
    }
    global Integer minX {
        get;
        set;
    }
    global Integer minY {
        get;
        set;
    }
    global BoundingBox() {

    }
}
global class CellLocation {
    global Integer colIndex {
        get;
        set;
    }
    global Integer rowIndex {
        get;
        set;
    }
    global CellLocation() {

    }
}
global class EntityBlock {
    global einsteinplay.Einstein_Probability.BoundingBox boundingBox {
        get;
        set;
    }
    global String entity {
        get;
        set;
    }
    global String text {
        get;
        set;
    }
    global EntityBlock() {

    }
}
global class NormalizedData {
    global Integer countryCode {
        get;
        set;
    }
    global String firstName {
        get;
        set;
    }
    global einsteinplay.Einstein_Probability.normalizedDataUnit fromx {
        get;
        set;
    }
    global String lastName {
        get;
        set;
    }
    global String middleName {
        get;
        set;
    }
    global Integer nationalNumber {
        get;
        set;
    }
    global String suffix {
        get;
        set;
    }
    global einsteinplay.Einstein_Probability.normalizedDataUnit to {
        get;
        set;
    }
    global String type {
        get;
        set;
    }
    global String unit {
        get;
        set;
    }
    global String value {
        get;
        set;
    }
    global NormalizedData() {

    }
}
global class Span {
    global Integer endx {
        get;
        set;
    }
    global Integer start {
        get;
        set;
    }
    global Span() {

    }
}
global class normalizedDataUnit {
    global String type {
        get;
        set;
    }
    global String unit {
        get;
        set;
    }
    global String value {
        get;
        set;
    }
    global normalizedDataUnit() {

    }
}
}
