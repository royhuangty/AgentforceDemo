import React, { Component, PropTypes } from 'react'
import * as d3 from 'd3'

// ratio of inner radius to outer radius
const InnerToOuterRadiusRatio = .625
// duration in milliseconds
const AnimationDuration = 250
// frames per second
const FramesPerSecond = 60

export default class DonutChart extends Component {
    static propTypes: {
        diameter: PropTypes.number.isRequired,
        percentFilled: PropTypes.number.isRequired,
        pieColor: PropTypes.string.isRequired,
        sliceColor: PropTypes.string.isRequired
    }

    constructor(props) {
        super(props)
        this.state = {
            percentFilled: 0,
            intervalId: null
        }
    }

    componentDidMount() {
        this.animate()
    }

    componentWillReceiveProps(nextProps) {
        let { percentFilled } = this.props

        if (nextProps.percentFilled !== percentFilled) {
            this.stop()
            let startingPercentFilled = this.state.percentFilled

            this.setState({
                intervalId: null
            }, () => {
                this.animate(nextProps.percentFilled > percentFilled, startingPercentFilled)
            })
        }
    }

    componentWillUnmount() {
        this.stop()
    }

    animate(forward = true, startingPercentFilled = 0) {
        let intervalId = window.setInterval(() => {
            this.step(intervalId, forward, startingPercentFilled)
        }, 1000 / FramesPerSecond)

        this.step(intervalId, forward, startingPercentFilled)
    }

    step(intervalId, forward, startingPercentFilled) {
        let frameRateMs = 1000 / FramesPerSecond
        let endPercentFilled = this.props.percentFilled

        let stepAmount = Math.abs(endPercentFilled - startingPercentFilled) / (AnimationDuration / frameRateMs)
        if (!forward) {
            stepAmount *= -1
        }
        let nextPercentFilled = this.state.percentFilled + stepAmount

        if (forward && nextPercentFilled >= endPercentFilled || !forward && nextPercentFilled <= endPercentFilled) {
            nextPercentFilled = endPercentFilled
            window.clearInterval(intervalId)
            intervalId = null
        }

        this.setState({
            intervalId,
            percentFilled: nextPercentFilled
        })
    }

    stop() {
        if (this.state.intervalId) {
            window.clearInterval(this.state.intervalId)
        }
    }

    render() {
        let {
            diameter,
            pieColor,
            sliceColor
        } = this.props
        let { percentFilled } = this.state

        let outerRadius = diameter/2
        let innerRadius = outerRadius * InnerToOuterRadiusRatio
        let fullCircle = Math.PI * 2

        let sliceArc = d3.svg.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius)
            .startAngle(0)
            .endAngle(fullCircle * percentFilled)

        let pieArc = d3.svg.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius)
            .startAngle(fullCircle * percentFilled)
            .endAngle(fullCircle)

        let boxDimensions = {
            height: `${diameter}px`,
            width: `${diameter}px`
        }
        return (
            <div className='donut-chart'>
                <svg style={boxDimensions}>
                    {/*Have to use height, width, and transform attributes so that it plays nicely in IE*/}
                    <g height={`${diameter}px`} width={`${diameter}px`} transform={`translate(${outerRadius}, ${outerRadius})`} >
                        <path d={sliceArc()} fill={sliceColor} stroke={sliceColor} />
                        {(() => {
                            if (percentFilled < 1) {
                                return <path d={pieArc()} fill={pieColor} stroke={pieColor} />
                            }
                        })()}
                    </g>
                </svg>
            </div>
        )
    }
}
