import React, {PropTypes, Component} from 'react';

import {linspace, ensureArray, undoEnsureArray} from './common';
import {propTypes, defaultProps} from './props.js';

import Handles from './Handles.js';
import Bars from './Bars.js';
import InputFields from './InputFields.js';

const LEFT_KEY = 37;
const UP_KEY = 38;
const RIGHT_KEY = 39;
const DOWN_KEY = 40;

// FIXME: split into multiple files? manage state outside of component?
class MultiSlider extends Component {

  static propTypes = propTypes
  static defaultProps = defaultProps

  // FIXME: use less context types / move logic up in the hierarchy
  static childContextTypes = {
    invert: PropTypes.bool,
    step: PropTypes.number,

    _onFocus: PropTypes.func,
    _onBlur: PropTypes.func,
    _onKeyDown: PropTypes.func,

    _start: PropTypes.func,
    _move: PropTypes.func,
    _end: PropTypes.func,

    _measureSlider: PropTypes.func,

    _posMinKey: PropTypes.func,
    _posMaxKey: PropTypes.func,
    _incKey: PropTypes.func,
    _decKey: PropTypes.func,

    _getMousePosition: PropTypes.func,
    _getTouchPosition: PropTypes.func,
  }

  getChildContext() {
    const {invert, step} = this.props;

    return {
      invert,
      step,

      _start: this._start,
      _move: this._move,
      _end: this._end,

      _measureSlider: this._measureSlider,

      _posMinKey: this._posMinKey,
      _posMaxKey: this._posMaxKey,
      _incKey: this._incKey,
      _decKey: this._decKey,

      _getMousePosition: this._getMousePosition,
      _getTouchPosition: this._getTouchPosition,
    };
  }

  constructor(props) {
    super(props);
    this.state = this._getInitialState();
  }

  componentWillReceiveProps(newProps) {
    this.setState(this._syncState(newProps));
  }

  _syncState = (props) => {
    const [valueKey, value] = this._getValueKeyAndValue(props);
    if (valueKey === null) return {};

    // TODO: really trim here?
    const trimmedValue = ensureArray(value).map(v => this._trimAlignValue(v, props));

    return {
      [valueKey]: trimmedValue,
    };
  }

  _getValueKeyAndValue = (props) => {
    const {value, defaultValue, min, max, children} = props;

    if (value) {
      return ['value', value];
    } else if (!this.state) {
      if (defaultValue) {
        return ['defaultValue', defaultValue];
      }

      const count = React.Children.count(children);

      if (count >= 2) {
        return ['defaultValue', linspace(min, max, count)];
      }

      return ['defaultValue', 0];
    }

    return [null, null];
  }

  _getInitialState = () => {
    const {value, defaultValue} = this.props;
    const state = this._syncState(this.props);
    const zIndices = (value || defaultValue).map((_, i) => i);

    return {
      ...state,
      zIndices,
      activeHandles: {},
    };
  }

  getValue() {
    // FIXME: there's potential for inconsistencies when a value was used, and then unused (or is that even possible?)
    const {value, defaultValue} = this.state;
    return undoEnsureArray(value || defaultValue);
  }

  // calculates the offset of a handle in pixels based on its value.
  _calcOffset = (value, sliderLength) => {
    const {min, max} = this.props;

    const ratio = (value - min) / (max - min);
    return ratio * sliderLength;
  }

  // calculates the value corresponding to a given pixel offset, i.e. the inverse of `_calcOffset`.
  _calcValue = (offset, sliderLength) => {
    const {min, max} = this.props;

    const ratio = offset / sliderLength;
    return ratio * (max - min) + min;
  }

  _getClosestIndex = (clickOffset, sliderLength) => {
    const {value, defaultValue} = this.state;
    const usedValue = value || defaultValue;

    let minDist = Number.MAX_VALUE;
    let closestIndex = -1;

    for (let [i, v] of usedValue.entries()) {
      const offset = this._calcOffset(v, sliderLength);
      const dist = Math.abs(clickOffset - offset);

      if (dist <= minDist) {
        minDist = dist;
        closestIndex = i;
      }
    }

    return closestIndex;
  }

  _calcOffsetFromPosition = (position, sliderStart) => {
    return Math.abs(position - sliderStart);
  }

  _calcValueFromPosition = (position, sliderStart, sliderLength) => {
    const clickOffset = this._calcOffsetFromPosition(position, sliderStart);

    const nextValue = this._trimAlignValue(this._calcValue(clickOffset, sliderLength));
    const closestIndex = this._getClosestIndex(clickOffset, sliderLength);

    return [nextValue, closestIndex];
  }

  // FIXME: take correct measurements when component is transformed via CSS
  _measureSlider = () => {
    const {invert} = this.props;
    const {slider} = this.refs;

    const sizeKey = this._sizeKey();
    const directionKey = this._directionKey();

    const sliderMin = slider[`offset${directionKey}`] + slider[`client${directionKey}`];
    const sliderMax = sliderMin + slider[sizeKey];

    return {
      sliderStart: invert ? sliderMax : sliderMin,
      sliderLength: Math.abs(sliderMax - sliderMin),
    };
  }

  _start = (index) => {
    const {activeHandles, zIndices} = this.state;

    this._hasMoved = false;

    zIndices.splice(zIndices.indexOf(index), 1); // remove wherever the element is
    zIndices.push(index); // add to end

    activeHandles[index] = true;

    this._fireChangeEvent('onBeforeChange');

    this.setState({
      activeHandles: {...activeHandles},
      zIndices: [...zIndices],
    });
  }

  _move = (index, toValue) => {
    const {min, max, minDistance, pearling, disabled} = this.props;
    const {value, defaultValue} = this.state;
    const usedValue = [...(value || defaultValue)];

    this._hasMoved = true;

    // TODO: remove, ensure _move is not called when slider is disabled
    // The reason is that event handlers can have other effect as well and therefore need to be disabled anyway,
    // so checking here again is probably redundant.
    if (disabled) return;

    const {length} = usedValue;
    const oldValue = usedValue[index];

    let newValue = this._trimAlignValue(toValue);

    // if "pearling" (= handles pushing each other) is disabled,
    // prevent the handle from getting closer than `minDistance` to the previous or next handle.
    if (!pearling) {
      if (index > 0) {
        const valueBefore = usedValue[index - 1];
        if (newValue < valueBefore + minDistance) {
          newValue = valueBefore + minDistance;
        }
      }

      if (index < length - 1) {
        const valueAfter = usedValue[index + 1];
        if (newValue > valueAfter - minDistance) {
          newValue = valueAfter - minDistance;
        }
      }
    }

    usedValue[index] = newValue;

    // if "pearling" is enabled, let the current handle push the pre- and succeeding handles.
    if (pearling && length > 1) {
      if (newValue > oldValue) {
        this._pushSucceeding(usedValue, minDistance, index);
        this._trimSucceeding(length, usedValue, minDistance, max);
      } else if (newValue < oldValue) {
        this._pushPreceding(usedValue, minDistance, index);
        this._trimPreceding(length, usedValue, minDistance, min);
      }
    }

    this.setState({defaultValue: usedValue}, () => this._fireChangeEvent('onChange'));
  }

  _pushSucceeding = (value, minDistance, index) => {
    for (let i = index, padding = value[i] + minDistance;
         value[i + 1] && padding > value[i + 1];
         i++, padding = value[i] + minDistance) {
      value[i + 1] = this._alignValue(padding);
    }
  }

  _trimSucceeding = (length, nextValue, minDistance, max) => {
    for (let i = 0; i < length; i++) {
      let padding = max - i * minDistance;
      if (nextValue[length - 1 - i] > padding) {
        nextValue[length - 1 - i] = padding;
      }
    }
  }

  _pushPreceding = (value, minDistance, index) => {
    for (let i = index, padding = value[i] - minDistance;
         value[i - 1] && padding < value[i - 1];
         i--, padding = value[i] - minDistance) {
      value[i - 1] = this._alignValue(padding);
    }
  }

  _trimPreceding = (length, nextValue, minDistance, min) => {
    for (let i = 0; i < length; i++) {
      let padding = min + i * minDistance;
      if (nextValue[i] < padding) {
        nextValue[i] = padding;
      }
    }
  }

  _end = (index) => {
    const {activeHandles} = this.state;

    this._hasMoved = false;
    this._fireChangeEvent('onAfterChange');

    delete activeHandles[index];

    this.setState({
      activeHandles: {...activeHandles},
    });
  }

  _axisKey = () => {
    const {orientation} = this.props;
    if (orientation === 'horizontal') return 'X';
    if (orientation === 'vertical') return 'Y';
  }

  _orthogonalAxisKey = () => {
    const {orientation} = this.props;
    if (orientation === 'horizontal') return 'Y';
    if (orientation === 'vertical') return 'X';
  }

  _posMinKey = () => {
    const {orientation, invert} = this.props;
    if (orientation === 'horizontal') return invert ? 'right' : 'left';
    if (orientation === 'vertical') return invert ? 'bottom' : 'top';
  }

  _posMaxKey = () => {
    const {orientation, invert} = this.props;
    if (orientation === 'horizontal') return invert ? 'left' : 'right';
    if (orientation === 'vertical') return invert ? 'top' : 'bottom';
  }

  _sizeKey = () => {
    const {orientation} = this.props;
    if (orientation === 'horizontal') return 'clientWidth';
    if (orientation === 'vertical') return 'clientHeight';
  }

  _directionKey = () => {
    const {orientation} = this.props;
    if (orientation === 'horizontal') return 'Left';
    if (orientation === 'vertical') return 'Top';
  }

  _incKey = () => {
    const {orientation, invert} = this.props;
    if (orientation === 'horizontal') return invert ? LEFT_KEY : RIGHT_KEY;
    if (orientation === 'vertical') return invert ? UP_KEY : DOWN_KEY;
  }

  _decKey = () => {
    const {orientation, invert} = this.props;
    if (orientation === 'horizontal') return invert ? RIGHT_KEY : LEFT_KEY;
    if (orientation === 'vertical') return invert ? DOWN_KEY : UP_KEY;
  }

  _trimAlignValue = (val, props) => {
    return this._alignValue(this._trimValue(val, props), props);
  }

  _trimValue = (val, props) => {
    const {min, max} = props || this.props;

    if (val <= min) return min;
    if (val >= max) return max;

    return val;
  }

  // FIXME: new implementation?
  _alignValue = (val, props) => {
    const {min, step} = props || this.props;

    const valModStep = (val - min) % step;

    let alignValue = val - valModStep;
    if (Math.abs(valModStep) * 2 >= step) {
      alignValue += valModStep > 0 ? step : -step;
    }

    return parseFloat(alignValue.toFixed(5));
  }

  _renderHandles = () => {
    const {min, max, handleClassName, handleActiveClassName, disabled, children} = this.props;
    const {value, defaultValue, activeHandles, zIndices} = this.state;

    return (
      <Handles
        value={value || defaultValue}
        activeHandles={activeHandles}
        zIndices={zIndices}
        min={min}
        max={max}
        handleClassName={handleClassName}
        handleActiveClassName={handleActiveClassName}
        disabled={disabled}
        >
        {children}
      </Handles>
    );
  }

  _renderBars = () => {
    const {min, max, barClassName} = this.props;
    const {value, defaultValue, activeHandles} = this.state;

    return (
      <Bars
        value={value || defaultValue}
        activeHandles={activeHandles}
        min={min}
        max={max}
        barClassName={barClassName}
        />
    );
  }

  _renderInputFields = () => {
    const {name, disabled, inputFieldClassName, min, max, step} = this.props;
    const {value, defaultValue} = this.state;

    return (
      <InputFields
        value={value || defaultValue}
        name={name}
        disabled={disabled}
        inputFieldClassName={inputFieldClassName}
        min={min}
        max={max}
        step={step}
        />
    );
  }

  _onSliderMouseUp = (e) => {
    const {snapDragDisabled} = this.props;

    this._hasMoved = false;

    if (!snapDragDisabled) {
      const {sliderStart, sliderLength} = this._measureSlider();
      const [position] = this._getPosition(e);
      const [value, closestIndex] = this._calcValueFromPosition(position, sliderStart, sliderLength);

      if (closestIndex >= 0) {
        this._move(closestIndex, value);
      }
    }
  }

  _fireChangeEvent = (eventType) => {
    const {[eventType]: callback} = this.props;
    const {defaultValue} = this.state;
    if (callback) {
      callback(undoEnsureArray(defaultValue));
    }
  }

  // FIXME: just return (x, y), change other code
  _getPosition= (e) => {
    return [
      e[`page${this._axisKey()}`],
      e[`page${this._orthogonalAxisKey()}`],
    ];
  }

  _getMousePosition = (e) => {
    return this._getPosition(e);
  }

  _getTouchPosition = ({touches}) => {
    // TODO: get "closest" touch to last touch
    const [touch] = touches;

    return this._getPosition(touch);
  }

  render() {
    const {className, style, disabled, withBars, withoutInputFields} = this.props;

    const newClassName = className + (disabled ? ' disabled' : '');
    const newStyle = {...style, position: 'relative'};

    const bars = withBars ? this._renderBars() : null;
    const handles = this._renderHandles();
    const inputFields = withoutInputFields ? null : this._renderInputFields();

    return (
      <div>
        <div
          ref="slider"
          className={newClassName}
          style={newStyle}
          onMouseUp={disabled ? null : this._onSliderMouseUp}
          >
          {bars}
          {handles}
        </div>
        {inputFields}
      </div>
    );
  }
}

export default MultiSlider;
