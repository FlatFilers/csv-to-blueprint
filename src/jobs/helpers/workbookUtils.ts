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

export async function createSheetConfig(
  headers: string[],
  records: any[]
): Promise<SheetConfig> {
  const fields = headers.map((header) => ({
    key: header,
    name: header,
    type: inferFieldType(records[0][header]),
  }))

  return {
    name: 'Dynamically Generated Blueprint',
    fields: fields as any[],
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
    const headers = Object.keys(recordsResponse.data.records[0])

    const sheetConfig = await createSheetConfig(
      headers,
      recordsResponse.data.records
    )

    console.log('Generated SheetConfig:', sheetConfig)

    await createWorkbookWithSheetConfig(sheetConfig, spaceId)

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
