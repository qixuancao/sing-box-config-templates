// Pure config composition: inputs are cloned; route order is preserved.
import {requireValue} from './errors.mjs';
import {object, clone} from './values.mjs';
import {validateNodes} from './nodes.mjs';

export function renderConfig(template, document) {
  const nodes = validateNodes(document);
  requireValue(object(template) && Array.isArray(template.outbounds) && Array.isArray(template.route?.rules), 'template');
  const config = clone(template);
  const allTags = nodes.outbounds.map(node => node.tag); const udpTags = nodes.udp_outbounds;
  config.outbounds = [...clone(nodes.outbounds), ...config.outbounds.filter(node => node.tag !== 'proxy-example')];
  for (const group of config.outbounds) {
    if (group.tag === 'select') group.outbounds = ['auto', 'udp-auto', ...allTags];
    if (group.tag === 'auto') group.outbounds = [...allTags];
    if (group.tag === 'udp-auto') group.outbounds = [...udpTags];
    if (group.tag === 'GLOBAL') group.outbounds = ['select', 'auto', 'udp-auto', ...allTags, 'direct'];
  }
  if (udpTags.length === 0) {
    config.outbounds = config.outbounds.filter(node => node.tag !== 'udp-auto');
    for (const group of config.outbounds) {
      if (['selector', 'urltest'].includes(group.type)) {
        group.outbounds = group.outbounds.filter(tag => tag !== 'udp-auto');
        if (group.default === 'udp-auto') group.default = 'auto';
      }
    }
    config.route.rules = config.route.rules.flatMap(rule => {
      if (rule.outbound === 'udp-auto') {
        const replaced = {...rule, action: 'reject', no_drop: true}; delete replaced.outbound; return [replaced];
      }
      if (rule.clash_mode === 'Global' && rule.outbound) return [{clash_mode: 'Global', network: 'udp', action: 'reject', no_drop: true}, rule];
      return [rule];
    });
  }
  validateReferences(config);
  return config;
}
function validateReferences(config) {
  const tags = config.outbounds.map(node => node.tag);
  requireValue(new Set(tags).size === tags.length, 'tag');
  const dnsTags = new Set((config.dns?.servers || []).map(server => server.tag));
  const rules = new Set((config.route?.rule_set || []).map(rule => rule.tag));
  const visit = value => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!object(value)) return;
    for (const [key, item] of Object.entries(value)) {
      if (['detour', 'outbound'].includes(key)) requireValue(tags.includes(item), 'reference');
      if (key === 'domain_resolver') requireValue(dnsTags.has(typeof item === 'string' ? item : item.server), 'reference');
      if (key === 'rule_set') {
        const names = typeof item === 'string' ? [item] : item;
        if (Array.isArray(names) && names.every(name => typeof name === 'string')) requireValue(names.every(name => rules.has(name)), 'reference');
      }
      visit(item);
    }
  };
  for (const node of config.outbounds) {
    if (['selector', 'urltest'].includes(node.type)) {
      requireValue(Array.isArray(node.outbounds) && node.outbounds.length && node.outbounds.every(tag => tags.includes(tag)), 'reference');
      if (node.default) requireValue(node.outbounds.includes(node.default), 'reference');
    }
  }
  requireValue(!config.route.final || tags.includes(config.route.final), 'reference');
  visit(config);
  const graph = new Map(config.outbounds.map(node => [node.tag,
    [...(['selector', 'urltest'].includes(node.type) ? node.outbounds : []), ...(node.detour ? [node.detour] : [])]]));
  const visiting = new Set(), visited = new Set();
  const checkCycle = tag => {
    requireValue(!visiting.has(tag), 'reference-cycle');
    if (visited.has(tag)) return;
    visiting.add(tag);
    graph.get(tag).forEach(checkCycle);
    visiting.delete(tag); visited.add(tag);
  };
  tags.forEach(checkCycle);
}
