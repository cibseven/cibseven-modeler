/*
 * Copyright CIB software GmbH and/or licensed to CIB software GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. CIB software licenses this file to you under the Apache License,
 * Version 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

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
