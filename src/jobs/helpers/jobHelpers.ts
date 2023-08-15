import api from '@flatfile/api'

/**
 * Acknowledges the start of a job and provides an initial progress update.
 * @param jobId - The ID of the job to acknowledge.
 * @param info - Information message about the job's progress.
 * @param progress - The current progress percentage of the job.
 */
export async function acknowledgeJob(
  jobId: string,
  info: string,
  progress: number
) {
  try {
    await api.jobs.ack(jobId, {
      info,
      progress,
    })
    console.log(`Job ${jobId} acknowledged with progress: ${progress}%`)
  } catch (error) {
    console.error(`Error acknowledging job ${jobId}:`, error)
  }
}

/**
 * Marks the job as complete and provides a final message and info.
 * @param jobId - The ID of the job to complete.
 * @param message - Final message upon job completion.
 * @param info - Updated information about the job's progress.
 */
export async function completeJob(
  jobId: string,
  message: string,
  info: string
) {
  try {
    await api.jobs.complete(jobId, {
      outcome: {
        message,
      },
      info,
    })
    console.log(
      `Job ${jobId} completed with message: ${message} and info: ${info}`
    )
  } catch (error) {
    console.error(`Error completing job ${jobId}:`, error)
  }
}

/**
 * Marks the job as failed and provides an error message and info.
 * @param jobId - The ID of the job to mark as failed.
 * @param message - Error message upon job failure.
 * @param info - Updated information about the job's progress.
 */
export async function failJob(jobId: string, message: string, info: string) {
  try {
    await api.jobs.fail(jobId, {
      outcome: {
        message,
      },
      info,
    })
    console.log(
      `Job ${jobId} failed with message: ${message} and info: ${info}`
    )
  } catch (error) {
    console.error(`Error failing job ${jobId}:`, error)
  }
}
