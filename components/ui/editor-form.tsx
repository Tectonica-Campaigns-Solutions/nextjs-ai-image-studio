import React from "react";
export default function EditForm() {
  const handleFormEdit = async () => {
    try {
      const imageResponse = await fetch(imageUrl);
      const blob = await imageResponse.blob();

      // Step 3: Wrap Blob into a File (like in the browser)
      // @ts-ignore
      const file = new File([blob], "image.png", { type: blob.type });
      const formData = new FormData();
      formData.append("image", file);
      formData.append('prompt', 'change man for woman');
      formData.append('useRag', 'true');
      console.log(formData)
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/edit-image`, {
        method: 'POST',
        body: formData,
      })
      console.log(response)
    } catch (error) {
      console.log(error);
    }
  }
  return (
    <div className="d-block">
      <form action="">
        <label htmlFor="">Prompt</label>
        <textarea name="" id=""></textarea>
      </form>
    </div>
  );
}