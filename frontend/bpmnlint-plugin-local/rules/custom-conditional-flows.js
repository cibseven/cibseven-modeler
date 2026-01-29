/**
 * A rule that checks that sequence flows outgoing from a
 * conditional forking gateway or activity are
 * either default flows _or_ have a condition attached
 */
module.exports = function() {

  function check(node, reporter) {
    const outgoing = node.outgoing || []

    if (isConditionalForking(node)) {    

    outgoing.forEach((flow) => {
      const missingCondition = (
        !hasCondition(flow) &&
        !isDefaultFlow(node, flow)
      )
      if (missingCondition) {
        reporter.report(flow.id, 'Sequence flow is missing condition or condition type is invalid', [ 'conditionExpression' ])
      }
    }) 
    return
  }
    if (outgoing.length > 1 && node?.$type === 'bpmn:ExclusiveGateway') {
      reporter.report(node.id, 'Sequence flow is missing condition or condition type is invalid', [ 'conditionExpression' ])
    }
  }
  
  return {
    check
  }

}

// helpers /////////////////////////////

function isConditionalForking(node) {
  const defaultFlow = node['default']
  const outgoing = node.outgoing || []

  return defaultFlow || outgoing.find(hasCondition)
}

function hasCondition(flow) {
  return !!flow.conditionExpression
}

function isDefaultFlow(node, flow) {
  return node['default'] === flow
}
