/**
 * Shared headers for the version selector table modal in `BpmnModeler.vue` and `DmnModeler.vue`.
 */
const versionHeaders = [
    {
        key: 'version',
        sortKey: 'version',
        label: 'headerVersion',
        class: 'col'
    },
    {
        key: 'updated',
        sortKey: 'updated',
        label: 'headerDate',
        class: 'col'
    }
]

/**
 * (Not shown) header for list-like emulation using the CibsevenTable in `BpmnModeler.vue` and `DmnModeler.vue`.
 */
const simpleTableHeader = [
    {
        key: 'name',
        class: 'col'
    }
]

export const getHeadersForSelector = typeOfSelector => {
	switch (typeOfSelector) {
		case 'changeVersion':
			return versionHeaders
		case 'templates':
			return simpleTableHeader
		default:
			return []
	}
}
