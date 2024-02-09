'use strict';

const _ = require('lodash');

const config = require('config');

const ENGINE_PARAM_FIELDS = [
  // 'index',
  // 'channel',
  // 'startPosSec',
  // 'endPosSec',
  // 'validSegment',
  // 'energy',
  // 'joy',
  // 'sad',
  // 'aggression',
  // 'stress',
  // 'uncertainty',
  // 'excitement',
  // 'uneasy',
  // 'concentration',
  // 'anticipation',
  // 'hesitation',
  // 'emotionBalance',
  // 'emotionEnergyBalance',
  // 'mentalEffort',
  // 'imagination',
  // 'arousal',
  // 'overallCognitiveActivity',
  // 'emotionCognitiveRatio',
  // 'extremeEmotion',
  // 'atmosphere',
  // 'voiceEnergy',
  // 'dissatisfied',
  // 'EDP-Energetic',
  // 'EDP-Passionate',
  // 'EDP-Emotional',
  // 'EDP-Uneasy',
  // 'EDP-Stressful',
  // 'EDP-Thoughtful',
  // 'EDP-Confident',
  // 'EDP-Concentrated',
  // 'EDP-Anticipation',
  // 'EDP-Hesitation',
  // 'callPriority',
  // 'callPriorityAgent',
  // 'VOL1',
  // 'VOL2',
  'SOS',
  'AVJ',
  'Fant',
  'Fflic',
  'Fmain',
  'JQ',
  'LJ',
  'SPJ',
  'SPT',
  'intCHL',
  'CoreType'
];

const maxmin = (v, max, min) => {
  if (!_.isNumber(v)) {
    return null;
  }
  if (_.isNumber(min)) {
    v = _.max([min, v]);
  }
  if (_.isNumber(max)) {
    v = _.min([max, v]);
  }
  return v;
};

const adjust = (v, max, min, adjust) => {
  v = maxmin(v, max, min);
  if (!_.isNumber(v)) {
    return null;
  }
  if (_.isNumber(adjust)) {
    v = (v - min) * adjust / (max - min);
  }
  return v;
};

const round = (v) => {
  if (!_.isNumber(v)) {
    return null;
  }
  return _.round(v);
};

const mee = (v) => {
  if (_.isUndefined(v)) {
    return undefined;
  }
  if (!_.isNumber(v)) {
    return null;
  }
  const str = ('0' + v).slice(-2);
  return parseInt(`${maxmin(parseInt(str[0]), 7, 1)}${maxmin(parseInt(str[1]), 8, 1)}`);
};

// 20231218_AmiVoice_add_new_parameter_coretype_add_const_coretype
const coretype = (ec, eb) => {
  if (!_.isNumber(ec)) {
    return null;
  }
  if (!_.isNumber(eb)) {
    return null;
  }
  const ec_range = ec < 285 ? "EN" : "ST"
  const eb_range = eb < 83 ? "LO" : "EM"

  return `${ec_range}-${eb_range}`;
}

// 20231218_AmiVoice_add_new_parameter_coretype_add_const_calec
const calec = (JQ, Fflic, AVJ, intCHL, LJ, Fmain) => {
  if (!_.isNumber(JQ)) {
    return null;
  }
  if (!_.isNumber(Fflic)) {
    return null;
  }
  if (!_.isNumber(AVJ)) {
    return null;
  }
  if (!_.isNumber(intCHL)) {
    return null;
  }
  if (!_.isNumber(LJ)) {
    return null;
  }
  if (!_.isNumber(Fmain)) {
    return null;
  }
  const cal = ((JQ + Fflic * 100 + AVJ * 0.1) * 100 / (intCHL * 0.1 + LJ * 10 + Fmain))
  return cal;
};

const _buildEsasParam = (engineParam) => {
  const esasParam = {
    Channel: engineParam.channel,
    StartPosSec: engineParam.startPosSec,
    EndPosSec: engineParam.endPosSec,
    Energy: round(adjust(engineParam.intCHL, 5000, 0, 100)),
    Stress: round(adjust(engineParam.JQ, 70, 10, 100)),
    'EMO/COG': round(maxmin(engineParam.emotionCognitiveRatio, 500, 1)),
    Concentration: round(adjust(engineParam.Fmain, 50, 20, 100)),
    Anticipation: round(adjust(engineParam.Fant, 70, 10, 100)),
    Excitement: round(maxmin(engineParam.excitement, 30, 0)),
    Hesitation: round(maxmin(engineParam.hesitation, 30, 0)),
    Uncertainty: round(maxmin(engineParam.uncertainty, 30, 0)),
    IntensiveThinking: round(adjust(engineParam.AVJ, 850, 400, 100)),
    ImaginationActivity: round(maxmin(engineParam.imagination, 30, 0)),
    Embarrassment: round(maxmin(engineParam.uneasy, 30, 0)),
    Passionate: round(maxmin(engineParam.arousal, 30, 0)),
    BrainPower: round(adjust(engineParam.overallCognitiveActivity, 2000, 0, 100)),
    Confidence: (_.isNumber(engineParam.uncertainty) ? round(maxmin(30 - engineParam.uncertainty, 30, 0)) : null),
    Aggression: round(maxmin(engineParam.aggression, 30, 0)),
    CallPriority: round(maxmin(engineParam.callPriority, 100, 0)),
    AgentScore: round(maxmin(engineParam.callPriorityAgent, 100, 0)),
    Atmosphere: round(maxmin(engineParam.atmosphere, 100, -100)),
    Upset: round(maxmin(engineParam.sad, 30, 0)),
    Content: round(maxmin(engineParam.joy, 30, 0)),
    Dissatisfaction: round(maxmin(engineParam.dissatisfied, 30, 0)),
    ExtremeEmotion: round(maxmin(engineParam.extremeEmotion, 30, 0)),
    'report.MEE': mee(engineParam['report.MEE']),
    CoreType: coretype(calec(engineParam.JQ, engineParam.Fflic, engineParam.AVJ, engineParam.intCHL, engineParam.LJ, engineParam.Fmain), engineParam.emotionCognitiveRatio), // 20231218_AmiVoice_add_new_parameter_coretype
  };
  for (const field of ENGINE_PARAM_FIELDS) {
    if (!_.isUndefined(engineParam[field])) {
      esasParam[`engine.${field}`] = engineParam[field];
    }
  }
  return esasParam;
};

exports.buildEsasParam = (engineParam, overwritePram = {}) => {
  if ((_.isNumber(engineParam.index) || _.isNumber(engineParam['report.MEE'])) && _.isNumber(engineParam.channel)) {
    const esassParam = _buildEsasParam(engineParam);
    for (const field in overwritePram) {
      esassParam[field] = overwritePram[field];
    }
    const params = {};
    for ( const customField in config.customFields) {
      if (!_.isUndefined(esassParam[customField])) {
        params[config.customFields[customField]] = esassParam[customField];
      }
    }
    return params;
  }
};

// 20231218_AmiVoice_add_new_parameter_coretype_add_function_getCoretypeValue
exports.getCoretypeValue = (engineParam) => {
  const ec1 = calec(engineParam.JQ, engineParam.Fflic, engineParam.AVJ, engineParam.intCHL, engineParam.LJ, engineParam.Fmain);
  const eb1 = engineParam.emotionCognitiveRatio;
  return [ec1, eb1];
}

// 20231218_AmiVoice_add_new_parameter_coretype_add_function_calAvgCoretype
exports.calAvgCoretype = (obj_coretype, channel) => {
  channel = !_.isString(channel) ? channel.toString() : channel;
  let ec1 = 0;
  let eb1 = 0;
  if (_.isUndefined(obj_coretype[channel])){
    return null;
  }
  for (const avg of obj_coretype[channel]){
    ec1 += avg[0];
    eb1 += avg[1];
  }
  const avg_ec1 = (ec1 / obj_coretype[channel].length);
  const avg_eb1 = (eb1 / obj_coretype[channel].length);
  
  return coretype(avg_ec1, avg_eb1);
}
