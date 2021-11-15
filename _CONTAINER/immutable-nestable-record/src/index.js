import Immutable from 'immutable';

function ensureArray(x) {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

function NestableRecord(defaultValues, types, name) {
  const _RecordType = Immutable.Record(defaultValues, name);

  function NestableRecordType(values) {
    if (values instanceof _RecordType) return values;

    const _values = values || defaultValues;
    const newValues = {..._values};

    for (let key in types) {
      const _value = _values[key];
      if (_value == null) continue;

      const type = ensureArray(types[key]);

      const f = (i, v) => {
        const res = type[i](v);

        if (type[i + 1]) {
          return res.map(x => f(i + 1, x));
        }

        return res;
      };

      newValues[key] = f(0, _value);
    }

    return _RecordType(newValues);
  }

  NestableRecordType.prototype = _RecordType.prototype;
  NestableRecordType.prototype.constructor = NestableRecordType;

  return NestableRecordType;
}

export default NestableRecord;
