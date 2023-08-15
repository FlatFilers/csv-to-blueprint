import { FlatfileListener, FlatfileEvent } from '@flatfile/listener'
import api from '@flatfile/api'

export function fileCreated(listener: FlatfileListener) {
  listener.on(
    'file:created',
    async ({ context: { fileId } }: FlatfileEvent) => {
      console.log(`File created with ID: ${fileId}`)

      try {
        let file = await api.files.get(fileId)
        console.log('File retrieved:', file)

        // Wait for the file's status to change to 'complete'
        while (file.data?.status !== 'complete') {
          console.log('Waiting for file to be complete...')
          await new Promise((res) => setTimeout(res, 2000)) // Wait for 2 seconds before checking again
          file = await api.files.get(fileId)
        }

        const actions = file.data?.actions || []
        console.log('Existing actions:', actions) // Log existing actions

        // Check for duplicate actions before adding new ones
        const hasLogFileAction = actions.some(
          (action) => action.operation === 'createWorkbookFromFile'
        )

        const newActions = [...actions]

        if (!hasLogFileAction) {
          newActions.push({
            operation: 'createWorkbookFromFile',
            label: 'Create Workbook From File',
            description:
              'This will create a Flatfile workbook based on the contents of the file.',
            mode: 'foreground',
            confirm: true,
          })
        }

        console.log('Updating file with new actions:', newActions)
        const updateResponse = await api.files.update(fileId, {
          actions: newActions,
        })
        console.log('Update Response:', updateResponse)

        // Retrieve the file again to check the updated actions
        const updatedFile = await api.files.get(fileId)
        console.log('Updated File retrieved:', updatedFile)
      } catch (error) {
        console.error('Error processing file:created event:', error)
      }
    }
  )
}
