import React from 'react'
import { ajax } from 'jquery'
import {
    isInternetExplorer,
    isEdge
} from '../../../../js/browser-check'

const SLDS_VERSION = '2.0.2'
let sldsAssetPath
let requests = {}

// determine if browser is crap
const isMicrosoftBrowser = isInternetExplorer() || isEdge()

export default class Svg extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            svg: null
        }
    }

    componentWillMount() {
        if (!sldsAssetPath) {
            console.log('sldsAssetPath has not been set. Use Svg.setAssetPath(path)')
        }

        if (isMicrosoftBrowser) {
            let { type, symbol } = this.props
            let url = `${sldsAssetPath}/icons/${type}/${symbol}.svg`

            if (!requests[url]) {
                requests[url] = ajax(url)
            }

            requests[url].then((xml) => {
                this.setState({
                    svg: xml.firstChild
                })
            })
        }
    }

    render() {
        if (isMicrosoftBrowser) {
            return this.renderSvgForIE()
        }

        let { type, symbol, props } = this.props

        return (
            <svg className={this.props.className} {...props}>
                <use xlinkHref={`${sldsAssetPath}/icons/${type}-sprite/svg/symbols.svg#${symbol}`} />
            </svg>
        );
    }

    renderSvgForIE() {
        let { svg } = this.state
        if (!svg) {
            return null
        }

        let props = this.props.props
        Array.prototype.forEach.call(svg.attributes, (attribute) => {
            props[attribute.name] = attribute.value
        })

        return (
            <svg className={this.props.className} {...props}>
                {Array.prototype.map.call(svg.childNodes, (child, index) => {
                    return this.renderSvgChildForIE(child, index, true)
                })}
            </svg>
        )
    }

    renderSvgChildForIE(node, index, filterFillAttribute = false) {
        let nodeName = node.nodeName.toLowerCase()
        let props = {
            xmlns: 'http://www.w3.org/2000/svg',
            key: `svg_${this.props.type}_${this.props.symbol}_child_${nodeName}_${index}`
        }

        let attributes = Array.prototype.slice.call(node.attributes)

        if (filterFillAttribute) {
            attributes = attributes.filter((attribute) => {
                return attribute.name !== 'fill'
            })
        }

        attributes.forEach((attribute) => {
            props[attribute.name] = attribute.value
        })

        let children = Array.prototype.slice.call(node.childNodes).map((child, j) => {
            return this.renderSvgChildForIE(child, `${index}_${j}`)
        })

        return React.createElement(nodeName, props, children)
    }
}

Svg.Types = {
    Action: 'action',
    Custom: 'custom',
    Doctype: 'doctype',
    Standard: 'standard',
    Utility: 'utility'
}

Svg.propTypes = {
    type: React.PropTypes.string.isRequired,
    symbol: React.PropTypes.string.isRequired,
    props: React.PropTypes.object
}

Svg.defaultProps = {
    props: {}
}

Svg.setAssetPath = (path) => {
    sldsAssetPath = path
}
