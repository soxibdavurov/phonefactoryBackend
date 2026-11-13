console.log("Blogs admin javascript file");

$(function () {
  $(".blog-status").on("change", async function (e) {
    const id = e.target.id;
    const blogStatus = $(`#${id}.blog-status`).val();

    try {
      const response = await axios.post(`/admin/blog/${id}`, { blogStatus });
      if (!response.data?.data) alert("Blog update failed");
      else if (blogStatus === "DELETE") window.location.reload();
    } catch (err) {
      console.log(err);
      alert("Blog update failed!");
    }
  });

  $(".blog-delete").on("click", async function () {
    const id = $(this).data("id");
    if (!confirm("Delete this blog?")) return;
    try {
      await axios.post(`/admin/blog/${id}`, { blogStatus: "DELETE" });
      window.location.reload();
    } catch (err) {
      console.log(err);
      alert("Blog delete failed!");
    }
  });
});

function validateBlogForm() {
  const title = $(".blog-title").val();
  const content = $(".blog-content").val();
  if (!title || !content) {
    alert("Title and content are required");
    return false;
  }
  return true;
}

function previewBlogImage(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const valid = ["image/jpg", "image/png", "image/jpeg", "image/webp"];
  if (!valid.includes(file.type)) {
    alert("Please insert only jpeg, jpg, png or webp files");
    input.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = function () {
    $("#blog-image-preview").attr("src", reader.result);
  };
  reader.readAsDataURL(file);
}
