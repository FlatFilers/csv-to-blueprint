// workbookUtils.ts
import api from '@flatfile/api'
import { SheetConfig } from '@flatfile/api/api'
import { Flatfile } from '@flatfile/api'
import { acknowledgeJob, completeJob, failJob } from '../helpers/jobHelpers'
import { FlatfileEvent } from '@flatfile/listener'

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
  if (typeof data === 'string') {
    return 'string'
  } else if (typeof data === 'number') {
    return 'number'
  } else if (typeof data === 'boolean') {
    return 'boolean'
  } else {
    return 'string' // Default to string if unable to infer
  }
}

async function createSheetConfig(
  headers: string[],
  records: any[]
): Promise<SheetConfig> {
  // Construct a mapping of constraints for each field
  const constraintsMapping: { [key: string]: any[] } = {}

  for (const record of records) {
    const fieldName = record.values['Field Name'].value

    headers.forEach((header) => {
      if (!constraintsMapping[header]) {
        constraintsMapping[header] = []
      }

      if (fieldName === 'Is Required?' && record.values[header].value === 'x') {
        constraintsMapping[header].push({ type: 'required' })
      } else if (
        fieldName === 'Is Unique?' &&
        record.values[header].value === 'x'
      ) {
        constraintsMapping[header].push({ type: 'unique' })
      }
      // You can add more conditions here for other types of constraints
    })
  }

  const fields = headers.map((header) => {
    const fieldType = inferFieldType(records[0].values[header].value)
    const constraints = constraintsMapping[header] || []

    return {
      key: header,
      name: header,
      type: fieldType,
      constraints: constraints,
    }
  })

  return {
    name: 'Dynamically Generated Blueprint',
    fields: fields as any[], // Temporarily cast to any[] to satisfy type checking
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
