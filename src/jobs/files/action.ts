import { FlatfileListener, FlatfileEvent } from '@flatfile/listener'
import api from '@flatfile/api'
import { acknowledgeJob, completeJob, failJob } from '../helpers/jobHelpers'

export function initiateCreateWorkbookFromFileJob(listener: FlatfileListener) {
  listener.filter(
    { job: 'file:createWorkbookFromFile' },
    (configure: FlatfileListener) => {
      configure.on(
        'job:ready',
        async ({ context: { fileId, jobId } }: FlatfileEvent) => {
          console.log(`Job ready for file with ID: ${fileId}`)

          try {
            await acknowledgeJob(jobId, 'Starting workbook creation.', 10)

            // Placeholder: Process the file to create a workbook
            const file = await api.files.get(fileId)
            console.log({ file })
            // Additional logic to create a workbook from the file goes here

            await completeJob(
              jobId,
              'Workbook creation is complete.',
              'The workbook has been successfully created.'
            )

            // Fetch and log the job status from the API
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
      )
    }
  )
}
