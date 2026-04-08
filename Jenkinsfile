#!groovy

@Library('cib-pipeline-library') _

import de.cib.pipeline.library.Constants

standardMavenPipeline(
    mvnParams: '-U',
    uiParamPresets: [
        'UNIT_TESTS': true,
        'SAST': false,
        // The Docker image is created in the custom stage with its own Maven profile
        'CREATE_DOCKER_IMAGE': false,
        'DEPLOY_HELM_CHARTS_TO_HARBOR': false
    ],
    // helmChartPaths: ['helm/cibseven-modeler'],
    office365WebhookId: Constants.OFFICE_365_FLOW_WEBHOOK_ID,
    mvnContainerName: Constants.MAVEN_JDK_17_CONTAINER,
    generateChangelog: true
)
