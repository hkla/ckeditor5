/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import {
	downcastInsertCell,
	downcastInsertRow,
	downcastInsertTable,
	downcastRemoveRow,
	downcastTableHeadingColumnsChange,
	downcastTableHeadingRowsChange
} from '../../src/converters/downcast';
import upcastTable, { upcastTableCell } from '../../src/converters/upcasttable';

/**
 * Returns a model representation of a table shorthand notation:
 *
 *		modelTable( [
 *			[ '00' ] // first row
 *			[ '10' ] // second row
 *		] );
 *
 *	will output:
 *
 *		'<table><tableRow><tableCell>00</tableCell></tableRow><tableRow><tableCell>10</tableCell></tableRow></table>'
 *
 * Each table row passed in `tableData` array is represented as an array of strings or objects. A string defines text contents of a cell.
 *
 * Passing an object allows to pass additional table cell attributes:
 *
 *		const tableCellData = {
 *			colspan: 2,
 *			rowspan: 4,
 *			contents: 'foo' // text contents of a cell
 *		};
 *
 * @param {Array.<String>} tableData
 * @param {Object} [attributes] Optional table attributes: `headingRows` and `headingColumns`.
 *
 * @returns {String}
 */
export function modelTable( tableData, attributes ) {
	const tableRows = makeRows( tableData, {
		cellElement: 'tableCell',
		rowElement: 'tableRow',
		headingElement: 'tableCell',
		wrappingElement: 'paragraph',
		enforceWrapping: true
	} );

	return `<table${ formatAttributes( attributes ) }>${ tableRows }</table>`;
}

/**
 * Returns a view representation of a table shorthand notation:
 *
 *		viewTable( [
 *			[ '00', '01' ] // first row
 *			[ '10', '11' ] // second row
 *		] );
 *
 *	will output:
 *
 *		'<table><tbody><tr><td>00</td><td>01<td></tr><tr><td>10</td><td>11<td></tr></tbody></table>'
 *
 * Each table row passed in `tableData` array is represented as an array of strings or objects. A string defines text contents of a cell.
 *
 * Passing an object allows to pass additional table cell attributes:
 *
 *		const tableCellData = {
 *			colspan: 2,
 *			rowspan: 4,
 *			isHeading: true, // will render table cell as `<th>` element
 *			contents: 'foo' // text contents of a cell
 *		};
 *
 * @param {Array.<Array.<String|Object>>} tableData The table data array.
 * @param {Object} [attributes] Optional table attributes: `headingRows` and `headingColumns` - passing them will properly render rows
 * in `<tbody>` or `<thead>` sections.
 *
 * @returns {String}
 */
export function viewTable( tableData, attributes = {} ) {
	const headingRows = attributes.headingRows || 0;

	const thead = headingRows > 0 ? `<thead>${ makeRows( tableData.slice( 0, headingRows ), {
		cellElement: 'th',
		rowElement: 'tr',
		headingElement: 'th',
		wrappingElement: 'p'
	} ) }</thead>` : '';
	const tbody = tableData.length > headingRows ?
		`<tbody>${ makeRows( tableData.slice( headingRows ), {
			cellElement: 'td',
			rowElement: 'tr',
			headingElement: 'th',
			wrappingElement: 'p'
		} ) }</tbody>` : '';

	return `<figure class="table"><table>${ thead }${ tbody }</table></figure>`;
}

/**
 * Formats model or view table - useful for chai assertions debugging.
 *
 * @param {String} tableString
 * @returns {String}
 */
export function formatTable( tableString ) {
	return tableString
		.replace( /<tableRow>/g, '\n<tableRow>\n    ' )
		.replace( /<thead>/g, '\n<thead>\n    ' )
		.replace( /<tbody>/g, '\n<tbody>\n    ' )
		.replace( /<tr>/g, '\n<tr>\n    ' )
		.replace( /<\/tableRow>/g, '\n</tableRow>' )
		.replace( /<\/thead>/g, '\n</thead>' )
		.replace( /<\/tbody>/g, '\n</tbody>' )
		.replace( /<\/tr>/g, '\n</tr>' )
		.replace( /<\/table>/g, '\n</table>' )
		.replace( /<\/figure>/g, '\n</figure>' );
}

/**
 * Returns formatted model table string.
 *
 * @param {Array.<String>} tableData
 * @param {Object} [attributes]
 * @returns {String}
 */
export function formattedModelTable( tableData, attributes ) {
	const tableString = modelTable( tableData, attributes );

	return formatTable( tableString );
}

/**
 * Returns formatted view table string.
 *
 * @param {Array.<String>} tableData
 * @param {Object} [attributes]
 * @returns {String}
 */
export function formattedViewTable( tableData, attributes ) {
	return formatTable( viewTable( tableData, attributes ) );
}

export function defaultSchema( schema ) {
	schema.register( 'table', {
		allowWhere: '$block',
		allowAttributes: [ 'headingRows', 'headingColumns' ],
		isObject: true
	} );

	schema.register( 'tableRow', { allowIn: 'table' } );

	schema.register( 'tableCell', {
		allowIn: 'tableRow',
		allowContentOf: '$block',
		allowAttributes: [ 'colspan', 'rowspan' ],
		isLimit: true
	} );

	schema.extend( '$block', { allowIn: 'tableCell' } );
	schema.register( 'paragraph', { inheritAllFrom: '$block' } );
}

export function defaultConversion( conversion, asWidget = false ) {
	conversion.elementToElement( { model: 'paragraph', view: 'p' } );

	// Table conversion.
	conversion.for( 'upcast' ).add( upcastTable() );
	conversion.for( 'downcast' ).add( downcastInsertTable( { asWidget } ) );

	// Table row conversion.
	conversion.for( 'downcast' ).add( downcastInsertRow( { asWidget } ) );
	conversion.for( 'downcast' ).add( downcastRemoveRow( { asWidget } ) );

	// Table cell conversion.
	conversion.for( 'downcast' ).add( downcastInsertCell( { asWidget } ) );
	conversion.for( 'upcast' ).add( upcastTableCell( 'td' ) );
	conversion.for( 'upcast' ).add( upcastTableCell( 'th' ) );

	// Table attributes conversion.
	conversion.attributeToAttribute( { model: 'colspan', view: 'colspan' } );
	conversion.attributeToAttribute( { model: 'rowspan', view: 'rowspan' } );

	conversion.for( 'downcast' ).add( downcastTableHeadingColumnsChange( { asWidget } ) );
	conversion.for( 'downcast' ).add( downcastTableHeadingRowsChange( { asWidget } ) );
}

// Formats table cell attributes
//
// @param {Object} attributes Attributes of a cell.
function formatAttributes( attributes ) {
	let attributesString = '';

	if ( attributes ) {
		const entries = Object.entries( attributes );

		if ( entries.length ) {
			attributesString = ' ' + entries.map( entry => `${ entry[ 0 ] }="${ entry[ 1 ] }"` ).join( ' ' );
		}
	}
	return attributesString;
}

// Formats passed table data to a set of table rows.
function makeRows( tableData, options ) {
	const { cellElement, rowElement, headingElement, wrappingElement, enforceWrapping } = options;

	return tableData
		.reduce( ( previousRowsString, tableRow ) => {
			const tableRowString = tableRow.reduce( ( tableRowString, tableCellData ) => {
				let contents = tableCellData;

				const isObject = typeof tableCellData === 'object';

				let resultingCellElement = cellElement;

				if ( isObject ) {
					contents = tableCellData.contents;

					// TODO: check...
					if ( tableCellData.isHeading ) {
						resultingCellElement = headingElement;
					}

					delete tableCellData.contents;
					delete tableCellData.isHeading;
				}

				if ( !( contents.replace( '[', '' ).replace( ']', '' ).startsWith( '<' ) ) && enforceWrapping ) {
					contents = `<${ wrappingElement }>${ contents }</${ wrappingElement }>`;
				}

				const formattedAttributes = formatAttributes( isObject ? tableCellData : '' );
				tableRowString += `<${ resultingCellElement }${ formattedAttributes }>${ contents }</${ resultingCellElement }>`;

				return tableRowString;
			}, '' );

			return `${ previousRowsString }<${ rowElement }>${ tableRowString }</${ rowElement }>`;
		}, '' );
}
