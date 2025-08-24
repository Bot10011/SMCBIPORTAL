export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { courseId, courseWorkId, fileId, fileName, fileLink, accessToken } = req.body;

    if (!courseId || !courseWorkId || !fileId || !fileName || !accessToken) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Create submission data
    const submissionData = {
      courseWorkType: 'ASSIGNMENT',
      assignmentSubmission: {
        attachments: [{
          driveFile: {
            id: fileId,
            title: fileName,
            alternateLink: fileLink,
          }
        }]
      }
    };

    console.log('Attempting to submit to Google Classroom:', { courseId, courseWorkId, fileId, fileName });

    // Create the submission
    const submissionResponse = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submissionData),
    });

    if (!submissionResponse.ok) {
      const errorText = await submissionResponse.text();
      console.error('Submission error:', errorText);
      return res.status(submissionResponse.status).json({ 
        error: `Submission failed: ${submissionResponse.status} ${submissionResponse.statusText}`,
        details: errorText
      });
    }

    const submission = await submissionResponse.json();
    console.log('Assignment submitted successfully:', submission);

    // Turn in the assignment
    const turnInResponse = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions/${submission.id}:turnIn`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!turnInResponse.ok) {
      const turnInError = await turnInResponse.text();
      console.error('Turn in error:', turnInError);
      return res.status(200).json({ 
        success: true,
        message: 'Assignment submitted successfully! Please turn it in manually.',
        submission: submission
      });
    }

    console.log('Assignment turned in successfully');
    return res.status(200).json({ 
      success: true,
      message: 'Assignment submitted and turned in successfully!',
      submission: submission
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
