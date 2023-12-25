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
  // 'SOS',
  // 'AVJ',
  // 'Fant',
  // 'Fflic',
  // 'Fmain',
  // 'JQ',
  // 'LJ',
  // 'SPJ',
  // 'SPT',
  // 'intCHL'
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
