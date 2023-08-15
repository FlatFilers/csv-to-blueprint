// workbookUtils.ts
import api from '@flatfile/api'
import { SheetConfig } from '@flatfile/api/api'
import { Flatfile } from '@flatfile/api'
import { acknowledgeJob, completeJob, failJob } from '../helpers/jobHelpers'
import { FlatfileEvent } from '@flatfile/listener'

const flatfileFieldTypeMapping: { [key: string]: string } = {
  String: 'string',
  Enumeration: 'enum',
  Int: 'number',
  Float: 'number',
  Boolean: 'boolean',
}

export async function createWorkbookWithSheetConfig(
  sheetConfig: SheetConfig,
  spaceId: string
): Promise<void> {
  try {
    const workbookConfig: Flatfile.CreateWorkbookConfig = {
      name: 'Dynamically Generated Workbook',
      spaceId,
      sheets: [sheetConfig],
    }

    const workbookResponse = await api.workbooks.create(workbookConfig)
    console.log('Workbook created:', workbookResponse)
  } catch (error) {
    console.error('Error creating workbook:', error)
    throw error
  }
}

export function inferFieldType(data: any): string {
  return flatfileFieldTypeMapping[data] || 'string' // default to 'string' if type is not recognized
}

function getEnumerationsForField(fieldName: string, records: any[]): string[] {
  const enumRecord = records.find(
    (record) => record.values['Field Name'].value === 'Enumerations'
  )
  const enumValue = enumRecord?.values[fieldName]?.value
  return enumValue ? enumValue.split(',').map((value) => value.trim()) : []
}

export async function createSheetConfig(
  headers: string[],
  records: any[]
): Promise<SheetConfig> {
  const constraintsMapping: { [key: string]: any[] } = {}

  for (const record of records) {
    // Check for "Is Required?" and add required constraint
    if (record.values['Field Name'].value === 'Is Required?') {
      for (const header of headers) {
        if (!constraintsMapping[header]) {
          constraintsMapping[header] = []
        }

        if (record.values[header].value === 'x') {
          constraintsMapping[header].push({ type: 'required' })
        }
      }
    }

    // Check for "Is Unique?" and add unique constraint
    if (record.values['Field Name'].value === 'Is Unique?') {
      for (const header of headers) {
        if (!constraintsMapping[header]) {
          constraintsMapping[header] = []
        }

        if (record.values[header].value === 'x') {
          constraintsMapping[header].push({ type: 'unique' })
        }
      }
    }
  }

  const fields = headers.map((header) => {
    const firstRecordValue = records[0].values[header].value
    const fieldType = inferFieldType(firstRecordValue)
    let config: any = {}

    switch (fieldType) {
      case 'string':
        config = { size: 'normal' }
        break
      case 'number':
        config = { decimalPlaces: 2 }
        break
      case 'boolean':
        config = { allowIndeterminate: false }
        break
      case 'enum':
        const enumValues = getEnumerationsForField(header, records)
        if (enumValues.length > 0) {
          config = {
            options: enumValues.map((value) => ({
              value,
              label: value,
            })),
          }
        }
        break
      // ... other cases ...
    }

    return {
      key: header,
      name: header,
      type: fieldType,
      constraints: constraintsMapping[header] || [],
      config: config,
    }
  })

  // ... rest of the function ...

  return {
    name: 'Dynamically Generated Blueprint',
    fields: fields as any[],
  }
}

async function deleteEmptyWorkbooks(spaceId: string): Promise<void> {
  try {
    console.log(`Attempting to delete empty workbooks for space: ${spaceId}`)

    const response = await api.workbooks.list({ spaceId })
    const workbooks = response.data
    console.log(`Found ${workbooks.length} workbooks in space: ${spaceId}`)

    for (const workbook of workbooks) {
      if (workbook.sheets.length === 0) {
        console.log(`Deleting empty workbook with ID: ${workbook.id}`)
        await api.workbooks.delete(workbook.id)
      } else {
        console.log(
          `Workbook with ID: ${workbook.id} has sheets and will not be deleted.`
        )
      }
    }
  } catch (error) {
    console.error('Error deleting empty workbooks:', error)
    throw error
  }
}

export async function handleJobReady({
  context: { fileId, jobId },
}: FlatfileEvent) {
  console.log(`Job ready for file with ID: ${fileId}`)

  try {
    await acknowledgeJob(jobId, 'Starting workbook creation.', 10)

    const file = await api.files.get(fileId)
    const workbookId = file.data.workbookId
    const workbook = await api.workbooks.get(workbookId)
    const spaceId = workbook.data.spaceId
    const sheetId = workbook.data.sheets[0].id

    const recordsResponse = await api.records.get(sheetId)
    const records = recordsResponse.data.records

    // Extract headers/column names from the records
    const headers = Object.keys(records[0].values) // Assuming the first record has all the headers

    // Generate the dynamic sheetConfig based on the headers and records
    const sheetConfig = await createSheetConfig(headers, records)

    console.log('Generated SheetConfig:', sheetConfig)

    await createWorkbookWithSheetConfig(sheetConfig, spaceId)

    await deleteEmptyWorkbooks(spaceId)

    await completeJob(
      jobId,
      'Workbook creation is complete.',
      'The workbook has been successfully formatted to match the blueprint structure.'
    )

    const jobStatus = await api.jobs.get(jobId)
    console.log(`Fetched status for job ${jobId}:`, jobStatus)
  } catch (e) {
    console.error('Error in createWorkbookFromFile job:', e)
    await failJob(
      jobId,
      'Workbook creation failed.',
      'An error occurred during workbook creation.'
    )
  }
}
