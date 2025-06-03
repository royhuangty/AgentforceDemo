import AddressFormatPattern from './addressFormatPattern.js';

/**
 * Address token types enum
 *
 * @private
 */
const AddressTokenTypes = Object.freeze({
    DATA: Symbol('data'),
    STRING: Symbol('string'),
    NEWLINE: Symbol('newline'),
    GROUP: Symbol('group'),
});

/**
 * AddressToken class
 *
 * @private
 */
class AddressToken {
    /**
     *
     * @param {AddressTokenTypes} type
     * @param {string} string
     * @param {*} pattern
     */
    constructor(type, string, pattern) {
        this.type = type;
        this.string = string;
        this.pattern = pattern;
    }

    /**
     * Construct a string type token
     *
     * @param {string} string String
     * @return {AddressToken} Address Token
     */
    static string(string) {
        return new AddressToken(AddressTokenTypes.STRING, string);
    }
    /**
     * Construct a data type token
     *
     * @param {pattern} pattern Address Format Pattern
     * @return {AddressToken} Address Token
     */
    static data(pattern) {
        return new AddressToken(AddressTokenTypes.DATA, undefined, pattern);
    }
    /**
     * Construct a new line type token
     *
     * @return {AddressToken} Address Token
     */
    static newLine() {
        return new AddressToken(AddressTokenTypes.NEWLINE);
    }
}

/**
 * TokenizerState class
 *
 * @private
 */
class TokenizerState {
    /**
     * Constructor
     *
     * @param {string} pattern
     * @param {int} start
     */
    constructor(pattern, start) {
        this.pattern = pattern;
        this.start = start;
    }
}

/**
 * Tokenize string pattern to AddressToken array
 *
 * @param {TokenizerState} state
 * @param {AddressToken[]} tokens
 * @return {TokenizerState} Tokenizer state
 *
 * @private
 */
function tokenize(state, tokens) {
    let nextIndex = state.start;
    if (state.pattern) {
        const len = state.pattern.length;
        while (state.start < len) {
            nextIndex = state.pattern.indexOf('%', nextIndex);
            if (nextIndex >= 0 && (nextIndex + 1) < len) {
                let placeHolder = state.pattern.substring(nextIndex + 1, nextIndex + 2);
                switch (placeHolder) {
                case 'n': {
                    if (nextIndex - state.start > 0) {
                        tokens.push(AddressToken.string(state.pattern.substring(state.start, nextIndex)));
                    }
                    tokens.push(AddressToken.newLine());
                    state.start = nextIndex + 2;
                    nextIndex = state.start;
                    break;
                }
                default: {
                    let p = AddressFormatPattern.fromPlaceHolder(placeHolder);
                    if (p) {
                        if (nextIndex - state.start > 0) {
                            tokens.push(AddressToken.string(state.pattern.substring(state.start, nextIndex)));
                        }
                        tokens.push(AddressToken.data(p));
                        state.start = nextIndex + 2;
                        nextIndex = state.start;
                    } else {
                        state.start = nextIndex + 2;
                        nextIndex = state.start;
                    }
                    break;
                }
                }
            } else {
                if (state.start < len) {
                    tokens.push(AddressToken.string(state.pattern.substring(state.start)));
                }
                state.start = len;
            }
        }
    }
    return state;
}

/**
 * Format line from tokens
 *
 * @param {*} tokens
 * @param {*} data
 * @param {*} ignoreEmptyLines
 * @param {*} firstIndex
 * @param {*} lastIndex
 * @return {string} Formatted line
 *
 * @private
 */
function formatLineTokens(tokens, data, ignoreEmptyLines, firstIndex, lastIndex) {
    let parts = [];
    for (let index = firstIndex; index <= lastIndex; index++) {
        let token = tokens[index];
        if (!token) {
            continue;
        } else if (token.type == AddressTokenTypes.DATA) {
            // Consume all subsequent data if available
            let dataBuffer = '';
            let lastDataIndex = index;
            for (let dataIndex = index; dataIndex <= lastIndex; dataIndex++) {
                let dataToken = tokens[dataIndex];
                if (!dataToken || dataToken.type != AddressTokenTypes.DATA) {
                    break;
                }
                let fieldData = AddressFormatPattern.getData(dataToken.pattern, data);
                if (fieldData) {
                    dataBuffer += fieldData;
                    lastDataIndex = dataIndex;
                }
            }
            let hasData = (dataBuffer && dataBuffer.length > 0);
            // Output previous string only if there is data before it,
            // or if it is the first on the line
            let hasPreviousData = false;
            if (index - 1 >= firstIndex) {
                let stringToken = tokens[index - 1];
                if (stringToken && stringToken.type == AddressTokenTypes.STRING && stringToken.string) {
                    for (let prevIndex = index - 2; prevIndex >= firstIndex; prevIndex--) {
                        let prevToken = tokens[prevIndex];
                        if (prevToken && prevToken.type == AddressTokenTypes.DATA) {
                            let fieldData = AddressFormatPattern.getData(prevToken.pattern, data);
                            if (fieldData) {
                                hasPreviousData = true;
                                break;
                            }
                        } else if (prevToken && prevToken.type == AddressTokenTypes.STRING) {
                            // ie. for "%C, %S %Z" without S -> "City, 95100"
                            // Comment this if we want "City 95100" instead
                            // (use the separator between S Z instead of C S)
                            stringToken = prevToken;
                        }
                    }
                    if (!ignoreEmptyLines || (hasPreviousData && hasData) || (index - 1 == firstIndex && hasData)) {
                        parts.push(stringToken.string);
                    }
                }
            }
            if (hasData) {
                parts.push(dataBuffer);
            }
            index = lastDataIndex;
            // Output next string only if it is the last
            // and there is previous data before it
            if (index + 1 == lastIndex) {
                let stringToken = tokens[index + 1];
                if (stringToken && stringToken.type == AddressTokenTypes.STRING && stringToken.string) {
                    if (!ignoreEmptyLines || hasData || hasPreviousData) {
                        parts.push(stringToken.string);
                    }
                }
                // Consume the last string token
                index = index + 1;
            }
        } else {
            // We should not get here
        }
    }
    return parts.join('').trim();
}

/**
 * Tokenize address format pattern.
 *
 * @param {AddressToken[]} tokens
 * @param {*} data
 * @param {string} lineBreak
 * @param {boolean} ignoreEmptyLines
 * @return {string} Formatted Address
 *
 * @private
 */
function formatTokens(tokens, data, lineBreak, ignoreEmptyLines) {
    let lines = [];
    let lineIndex = -1;
    for (let index = 0; index < tokens.length; index++) {
        let doFormat = false;
        let endWithNewLine = false;
        let token = tokens[index];
        switch (token.type) {
        case AddressTokenTypes.NEWLINE: {
            if (lineIndex >= 0) {
                doFormat = true;
                endWithNewLine = true;
            } else if (!ignoreEmptyLines) {
                lines.push(''); // Empty line
                // If the pattern ends with a newline
                if (index + 1 == tokens.length) {
                    lines.push(''); // Empty line
                }
            }
            break;
        }
        default: {
            lineIndex = lineIndex < 0 ? index : lineIndex;
            doFormat = index + 1 == tokens.length ? true : doFormat;
            break;
        }
        }
        if (doFormat) {
            let line = formatLineTokens(tokens, data, ignoreEmptyLines, lineIndex, endWithNewLine ? index - 1 : index);
            if (!ignoreEmptyLines || line) {
                lines.push(line);
            }
            // If line ends with a newline, and it is the last line on pattern
            if (!ignoreEmptyLines && endWithNewLine && index + 1 == tokens.length) {
                lines.push('');
            }
            lineIndex = -1;
        }
    }
    return lines.join(lineBreak);
}

/**
 * Format address data.
 *
 * @param {*} data Address data being processed.
 * @param {string} pattern Address format pattern.
 * @param {string} lineBreak Line break string to use
 * @param {boolean} ignoreEmptyLines Ignore lines that has no or empty data to replace.
 * @return {string} Formatted address.
 */
function format(data, pattern, lineBreak, ignoreEmptyLines) {
    // TODO: support escapeHtml to match Java class feature parity
    ignoreEmptyLines = ignoreEmptyLines === false ? false : true; // Defaults to false
    lineBreak = lineBreak || '\n'; // Defaults to <br/> or lf
    let tokens = [];
    tokenize(new TokenizerState(pattern, 0), tokens);
    return formatTokens(tokens, data, lineBreak, ignoreEmptyLines);
}

export default {format};
