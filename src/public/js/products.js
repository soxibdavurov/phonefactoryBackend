console.log("Products frontend javascript file");

$(function () {
  const toggleProductFields = () => {
    const selectedValue = $(".product-collection").val();
    const phoneLike = selectedValue === "SMARTPHONE" || selectedValue === "TABLET";
    if (phoneLike) {
      $("#brand").show();
      $("#size-collection").show();
    } else {
      $("#brand").hide();
      $("#size-collection").hide();
    }
    if (selectedValue === "TARIFF") {
      $("#brand").show();
      $("#size-collection").hide();
      $("#tariff-type").show();
    } else {
      $("#tariff-type").hide();
    }
  };

  $(".product-collection").on("change", toggleProductFields);
  toggleProductFields();

  // $("#process-btn").on("click", () => {
  //   $(".dish-container").slideToggle(500);
  //   $("#process-btn").css("display", "none");
  //   $("#cancel-btn").css("display", "flex");
  // });

  // $("#cancel-btn").on("click", () => {
  //   $(".dish-container").slideToggle(500);
  //   $("#cancel-btn").css("display", "none");
  //   $("#process-btn").css("display", "flex");
  // });

  $(".new-product-status").on("change", async function (e) {
    const id = e.target.id;
    const productStatus = $(`#${id}.new-product-status`).val();
    console.log("id:", id);

    try {
      const response = await axios.post(`/admin/product/${id}`, {
        productStatus: productStatus,
      });
      const result = response.data;
      if (result.data) {
        $(".new-product-status").blur();
      } else alert("Product update is failed");
    } catch (err) {
      console.log(err);
      alert("Product update failed!");
    }
  });
});

function validateForm() {
  const productName = $(".product-name").val();
  const productPrice = $(".product-price").val();
  const productLeftCount = $(".product-left-count").val();
  const productCollection = $(".product-collection").val();
  const productDesc = $(".product-desc").val();

  if (
    productName == "" ||
    productPrice == "" ||
    productLeftCount == "" ||
    productCollection == "" ||
    productDesc == ""
  ) {
    alert("Please insert all required details!");
    return false;
  } else return true;
}

function previewFileHandler(input, order) {
  const imgClassName = input.className;
  console.log("img", input);

  const file = $(`.${imgClassName}`).get(0).files[0];
  const fileType = file["type"];
  const validImageType = ["image/jpg", "image/png", "image/jpeg", "image/webp"];

  if (!validImageType.includes(fileType)) {
    alert("Please, insert only jpeg, jpg, png files!");
  } else {
    if (file) {
      const reader = new FileReader();
      reader.onload = function () {
        $(`#image-section-${order}`).attr("src", reader.result);
      };
      reader.readAsDataURL(file);
    }
  }
}
